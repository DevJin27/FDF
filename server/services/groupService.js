const { v4: uuid } = require('uuid');
const state = require('../state');

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
  const groups = getAllGroups();
  const normalizedCode = String(code || '').toUpperCase();
  const group =
    Object.values(groups).find((candidate) => candidate && candidate.code === normalizedCode) || null;

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

module.exports = {
  generateCode,
  createGroup,
  joinGroup,
  leaveGroup,
};
