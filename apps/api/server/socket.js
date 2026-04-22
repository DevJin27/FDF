const { getCartTotals } = require("./services/cartService");
const { getGroup, getGroups, updateGroup } = require("./state");

const socketMemberships = new Map();

function rememberMembership(socketId, membership) {
  const memberships = socketMemberships.get(socketId) || [];
  const exists = memberships.some(
    (entry) => entry.groupId === membership.groupId && entry.userId === membership.userId,
  );

  if (!exists) {
    memberships.push(membership);
    socketMemberships.set(socketId, memberships);
  }
}

function removeMembership(socketId, membership) {
  const memberships = (socketMemberships.get(socketId) || []).filter(
    (entry) => !(entry.groupId === membership.groupId && entry.userId === membership.userId),
  );

  if (memberships.length === 0) {
    socketMemberships.delete(socketId);
    return;
  }

  socketMemberships.set(socketId, memberships);
}

function emitCartUpdated(io, group) {
  io.to(group.id).emit("cart_updated", {
    cart: group.cart,
    totals: getCartTotals(group.cart),
  });
}

function emitHostChanged(io, group, newHost) {
  io.to(group.id).emit("host_changed", {
    newHostId: newHost.id,
    newHostName: newHost.name,
  });
}

function promoteNextHost(io, groupId) {
  const group = getGroup(groupId);
  if (!group) {
    return null;
  }

  const nextHost = [...group.participants]
    .filter((participant) => participant.online)
    .sort((left, right) => left.joinedAt - right.joinedAt)[0];

  if (!nextHost || nextHost.id === group.hostId) {
    return group;
  }

  const nextGroup = updateGroup(group.id, {
    ...group,
    hostId: nextHost.id,
    settlement: {
      ...group.settlement,
      hostName: nextHost.name,
    },
  });

  emitHostChanged(io, nextGroup, nextHost);
  return nextGroup;
}

function markParticipantOffline(io, groupId, userId) {
  const group = getGroup(groupId);
  if (!group) {
    return null;
  }

  const participant = group.participants.find((entry) => entry.id === userId);
  if (!participant) {
    return group;
  }

  if (!participant.online) {
    if (group.hostId === userId) {
      return promoteNextHost(io, groupId) || group;
    }

    return group;
  }

  const nextGroup = updateGroup(group.id, (currentGroup) => ({
    ...currentGroup,
    participants: currentGroup.participants.map((entry) =>
      entry.id === userId
        ? {
            ...entry,
            online: false,
          }
        : entry,
    ),
  }));

  io.to(groupId).emit("user_left", { userId });

  if (group.hostId === userId) {
    return promoteNextHost(io, groupId) || nextGroup;
  }

  return nextGroup;
}

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("join_room", ({ groupId, userId }) => {
      if (!groupId || !userId) {
        return;
      }

      const group = getGroup(groupId);
      if (!group) {
        return;
      }

      const participant = group.participants.find((entry) => entry.id === userId);
      if (!participant) {
        return;
      }

      socket.join(groupId);
      rememberMembership(socket.id, { groupId, userId });

      const now = Date.now();
      const nextGroup = updateGroup(groupId, (currentGroup) => ({
        ...currentGroup,
        participants: currentGroup.participants.map((entry) =>
          entry.id === userId
            ? {
                ...entry,
                online: true,
                lastSeen: now,
              }
            : entry,
        ),
      }));

      const nextParticipant = nextGroup.participants.find((entry) => entry.id === userId);
      io.to(groupId).emit("user_joined", {
        participant: nextParticipant,
      });
    });

    socket.on("leave_room", ({ groupId, userId }) => {
      if (!groupId || !userId) {
        return;
      }

      socket.leave(groupId);
      removeMembership(socket.id, { groupId, userId });
      markParticipantOffline(io, groupId, userId);
    });

    socket.on("heartbeat", ({ groupId, userId }) => {
      if (!groupId || !userId) {
        return;
      }

      const group = getGroup(groupId);
      if (!group) {
        return;
      }

      updateGroup(groupId, (currentGroup) => ({
        ...currentGroup,
        participants: currentGroup.participants.map((participant) =>
          participant.id === userId
            ? {
                ...participant,
                online: true,
                lastSeen: Date.now(),
              }
            : participant,
        ),
      }));
    });

    socket.on("disconnect", () => {
      const memberships = socketMemberships.get(socket.id) || [];
      memberships.forEach(({ groupId, userId }) => {
        markParticipantOffline(io, groupId, userId);
      });
      socketMemberships.delete(socket.id);
    });
  });
}

function runLifecycleSweep(io) {
  const now = Date.now();

  Object.values(getGroups()).forEach((group) => {
    group.participants
      .filter((participant) => participant.online && participant.lastSeen && now - participant.lastSeen > 30000)
      .forEach((participant) => {
        markParticipantOffline(io, group.id, participant.id);
      });

    const minutesLeft = Math.ceil((group.expiresAt - now) / 60000);
    const warningWindowReached = minutesLeft <= 5 && minutesLeft > 0;

    if (group.status === "open" && warningWindowReached && !group.warningSentAt) {
      updateGroup(group.id, { warningSentAt: now });
      io.to(group.id).emit("session_warning", { minutesLeft: 5 });
    }

    if (group.status === "open" && now >= group.expiresAt) {
      const lockedGroup = updateGroup(group.id, (currentGroup) => ({
        ...currentGroup,
        status: "locked",
      }));

      io.to(group.id).emit("session_expired", {});
      io.to(group.id).emit("group_locked", {
        finalCart: lockedGroup.cart,
      });
      emitCartUpdated(io, lockedGroup);
    }
  });
}

module.exports = {
  emitCartUpdated,
  emitHostChanged,
  promoteNextHost,
  registerSocketHandlers,
  runLifecycleSweep,
};
