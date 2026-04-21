const { v4: uuid } = require('uuid');
const state = require('../state');

function getIo() {
  try {
    return require('../index').io;
  } catch (error) {
    return null;
  }
}

function getAllGroups() {
  if (typeof state.getAllGroups === 'function') {
    return state.getAllGroups();
  }

  if (typeof state.getGroups === 'function') {
    return state.getGroups();
  }

  if (typeof state.getState === 'function') {
    const current = state.getState();
    if (current && current.groups && typeof current.groups === 'object') {
      return current.groups;
    }
  }

  if (state.groups && typeof state.groups === 'object') {
    return state.groups;
  }

  return {};
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const groups = getAllGroups();
  const usedCodes = new Set(
    Object.values(groups)
      .map((group) => group && group.code)
      .filter(Boolean)
  );

  let code = '';
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (usedCodes.has(code));

  return code;
}

function createGroup({ name, address, hostId, hostName }) {
  const now = Date.now();
  const group = {
    id: uuid(),
    code: generateCode(),
    name,
    address,
    hostId,
    hostName,
    status: 'open',
    createdAt: now,
    expiresAt: now + 20 * 60 * 1000,
    participants: [
      {
        id: hostId,
        name: hostName,
        joinedAt: now,
        online: true,
        isHost: true,
      },
    ],
    cart: [],
    deliveryFee: 40,
    settlement: {
      upiId: '',
      payments: {},
    },
  };

  state.createGroup(group);
  return group;
}

function joinGroup({ code, userId, userName }) {
  const group = getGroupByCode(code);

  if (!group) {
    throw new Error('Group not found');
  }

  if (group.status !== 'open') {
    throw new Error('Group is locked');
  }

  if (group.participants.length >= 10) {
    throw new Error('Group is full');
  }

  if (group.participants.some((participant) => participant.id === userId)) {
    throw new Error('Already in group');
  }

  group.participants.push({
    id: userId,
    name: userName,
    joinedAt: Date.now(),
    online: true,
    isHost: false,
  });

  state.updateGroup(group.id, group);
  return group;
}

function getGroupByCode(code) {
  const groups = getAllGroups();
  const normalizedCode = String(code || '').toUpperCase();

  return Object.values(groups).find((group) => group && group.code === normalizedCode) || null;
}

function leaveGroup({ groupId, userId }) {
  const group = state.getGroup(groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  const participant = group.participants.find((candidate) => candidate.id === userId);
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
    throw new Error('Group not found');
  }

  const nextHost =
    group.participants.find(
      (participant) => participant.online === true && participant.id !== group.hostId
    ) || null;

  if (!nextHost) {
    lockGroup(groupId);
    return null;
  }

  group.hostId = nextHost.id;
  group.hostName = nextHost.name;
  group.participants = group.participants.map((participant) => ({
    ...participant,
    isHost: participant.id === nextHost.id,
  }));

  state.updateGroup(group.id, group);

  const io = getIo();
  if (io) {
    io.to(group.id).emit('host_changed', {
      newHostId: nextHost.id,
      newHostName: nextHost.name,
    });
  }

  return { newHostId: nextHost.id };
}

function lockGroup(groupId) {
  const group = state.getGroup(groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  group.status = 'locked';
  state.updateGroup(group.id, group);

  const io = getIo();
  if (io) {
    io.to(group.id).emit('group_locked', { groupId: group.id });
  }

  return group;
}

function setUpiId({ groupId, upiId, hostName }) {
  const group = state.getGroup(groupId);
  if (!group) {
    throw new Error('Group not found');
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
    throw new Error('Group not found');
  }

  const existingSettlement = group.settlement || {};
  group.settlement = {
    ...existingSettlement,
    payments: {
      ...(existingSettlement.payments || {}),
      [userId]: 'paid',
    },
  };

  state.updateGroup(group.id, group);
  return group;
}

module.exports = {
  generateCode,
  createGroup,
  joinGroup,
  leaveGroup,
  promoteNextHost,
  lockGroup,
  getGroupByCode,
  setUpiId,
  markPaid,
};
