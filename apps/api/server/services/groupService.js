const state = require("../state");

function getIo() {
  try {
    return require("../index").io;
  } catch {
    return null;
  }
}

const GROUP_CODE_LENGTH = 6;
const GROUP_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const GROUP_TTL_MS = 20 * 60 * 1000;
const MAX_PARTICIPANTS = 10;

function generateCode() {
  let code = "";
  for (let i = 0; i < GROUP_CODE_LENGTH; i += 1) {
    code += GROUP_CODE_CHARS[Math.floor(Math.random() * GROUP_CODE_CHARS.length)];
  }
  return code;
}

function generateUniqueCode() {
  let code = generateCode();
  while (state.getGroup(code)) {
    code = generateCode();
  }
  return code;
}

function createGroup({ name, address, hostId, hostName }) {
  const now = Date.now();
  const code = generateUniqueCode();

  const group = state.createGroup({
    id: code,
    code,
    name: String(name).trim(),
    address: String(address).trim(),
    hostId,
    status: "open",
    createdAt: now,
    expiresAt: now + GROUP_TTL_MS,
    warningSentAt: null,
    participants: [
      {
        id: hostId,
        name: String(hostName).trim(),
        joinedAt: now,
        lastSeen: now,
        online: true,
      },
    ],
    cart: [],
    deliveryFee: 40,
    settlement: {
      upiId: "",
      hostName: String(hostName).trim(),
      payments: {},
    },
  });

  return group;
}

function joinGroup({ code, userId, userName }) {
  const group = state.getGroup(String(code).trim().toUpperCase());

  if (!group) {
    throw Object.assign(new Error("Group not found"), { status: 404 });
  }
  if (group.status !== "open") {
    throw Object.assign(new Error("Group is locked"), { status: 400 });
  }
  if (Date.now() >= group.expiresAt) {
    state.updateGroup(group.id, { status: "locked" });
    throw Object.assign(new Error("Group has expired"), { status: 400 });
  }

  const existing = group.participants.find((p) => p.id === userId);
  const now = Date.now();

  if (!existing && group.participants.length >= MAX_PARTICIPANTS) {
    throw Object.assign(new Error("Group is full"), { status: 400 });
  }

  const nextGroup = state.updateGroup(group.id, (current) => {
    const idx = current.participants.findIndex((p) => p.id === userId);

    if (idx >= 0) {
      const participants = current.participants.map((p, i) =>
        i === idx
          ? { ...p, name: String(userName).trim(), lastSeen: now, online: true }
          : p,
      );
      return { ...current, participants };
    }

    return {
      ...current,
      participants: [
        ...current.participants,
        {
          id: userId,
          name: String(userName).trim(),
          joinedAt: now,
          lastSeen: now,
          online: true,
        },
      ],
    };
  });

  return nextGroup;
}

function getGroupByCode(code) {
  return state.getGroup(String(code).trim().toUpperCase()) || null;
}

function leaveGroup({ groupId, userId }) {
  const group = state.getGroup(groupId);
  if (!group) {
    throw Object.assign(new Error("Group not found"), { status: 404 });
  }

  const participant = group.participants.find((p) => p.id === userId);
  if (!participant) {
    return null;
  }

  participant.online = false;

  let hostChange = null;
  if (userId === group.hostId) {
    hostChange = promoteNextHost(groupId);
  } else {
    state.updateGroup(group.id, group);
  }

  return hostChange;
}

function promoteNextHost(groupId) {
  const group = state.getGroup(groupId);
  if (!group) {
    throw Object.assign(new Error("Group not found"), { status: 404 });
  }

  const nextHost =
    group.participants.find((p) => p.online && p.id !== group.hostId) || null;

  if (!nextHost) {
    lockGroup(groupId);
    return null;
  }

  group.hostId = nextHost.id;
  group.hostName = nextHost.name;
  group.participants = group.participants.map((p) => ({
    ...p,
    isHost: p.id === nextHost.id,
  }));

  state.updateGroup(group.id, group);

  const io = getIo();
  if (io) {
    io.to(group.id).emit("host_changed", {
      newHostId: nextHost.id,
      newHostName: nextHost.name,
    });
  }

  return { newHostId: nextHost.id };
}

function lockGroup(groupId) {
  const group = state.getGroup(groupId);
  if (!group) {
    throw Object.assign(new Error("Group not found"), { status: 404 });
  }

  group.status = "locked";
  state.updateGroup(group.id, group);

  const io = getIo();
  if (io) {
    io.to(group.id).emit("group_locked", { groupId: group.id });
  }

  return group;
}

function setUpiId({ groupId, upiId, hostName }) {
  const group = state.getGroup(groupId);
  if (!group) {
    throw Object.assign(new Error("Group not found"), { status: 404 });
  }

  group.settlement = {
    ...(group.settlement || {}),
    upiId,
    hostName,
  };

  state.updateGroup(group.id, group);
  return group;
}

function markPaid({ groupId, userId }) {
  const group = state.getGroup(groupId);
  if (!group) {
    throw Object.assign(new Error("Group not found"), { status: 404 });
  }

  const existing = group.settlement || {};
  group.settlement = {
    ...existing,
    payments: {
      ...(existing.payments || {}),
      [userId]: "paid",
    },
  };

  state.updateGroup(group.id, group);
  return group;
}

module.exports = {
  generateCode,
  generateUniqueCode,
  createGroup,
  joinGroup,
  leaveGroup,
  promoteNextHost,
  lockGroup,
  getGroupByCode,
  setUpiId,
  markPaid,
};
