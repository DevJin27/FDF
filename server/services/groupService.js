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

module.exports = {
  generateCode,
  createGroup,
};
