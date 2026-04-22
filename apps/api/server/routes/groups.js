const express = require("express");
const { createGroup, getGroup, updateGroup } = require("../state");

const GROUP_TTL_MS = 20 * 60 * 1000;
const MAX_PARTICIPANTS = 10;
const GROUP_CODE_LENGTH = 6;
const GROUP_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isExpired(group) {
  return Date.now() >= group.expiresAt;
}

function generateGroupCode() {
  let code = "";
  for (let index = 0; index < GROUP_CODE_LENGTH; index += 1) {
    const charIndex = Math.floor(Math.random() * GROUP_CODE_CHARS.length);
    code += GROUP_CODE_CHARS[charIndex];
  }

  return code;
}

function generateUniqueGroupCode() {
  let code = generateGroupCode();

  while (getGroup(code)) {
    code = generateGroupCode();
  }

  return code;
}

function ensureGroupIsJoinable(group) {
  if (!group) {
    throw createHttpError(404, "Group not found");
  }

  if (group.status !== "open") {
    throw createHttpError(400, "Group is locked");
  }

  if (isExpired(group)) {
    updateGroup(group.id, { status: "locked" });
    throw createHttpError(400, "Group has expired");
  }
}

function createGroupsRouter() {
  const router = express.Router();

  router.post("/", (req, res, next) => {
    try {
      const { name, address, hostName, hostId } = req.body || {};

      if (!name || !address || !hostName || !hostId) {
        throw createHttpError(400, "name, address, hostName, and hostId are required");
      }

      const now = Date.now();
      const code = generateUniqueGroupCode();

      const group = createGroup({
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

      res.status(201).json({
        groupId: group.id,
        code: group.code,
        group,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/join", (req, res, next) => {
    try {
      const { code, userId, userName } = req.body || {};

      if (!code || !userId || !userName) {
        throw createHttpError(400, "code, userId, and userName are required");
      }

      const group = getGroup(String(code).trim().toUpperCase());
      ensureGroupIsJoinable(group);

      const existingParticipant = group.participants.find((participant) => participant.id === userId);
      const now = Date.now();

      if (!existingParticipant && group.participants.length >= MAX_PARTICIPANTS) {
        throw createHttpError(400, "Group is full");
      }

      const nextGroup = updateGroup(group.id, (currentGroup) => {
        const participantIndex = currentGroup.participants.findIndex((participant) => participant.id === userId);

        if (participantIndex >= 0) {
          const participants = currentGroup.participants.map((participant, index) =>
            index === participantIndex
              ? {
                  ...participant,
                  name: String(userName).trim(),
                  lastSeen: now,
                  online: true,
                }
              : participant,
          );

          return {
            ...currentGroup,
            participants,
          };
        }

        return {
          ...currentGroup,
          participants: [
            ...currentGroup.participants,
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

      res.json({ group: nextGroup });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", (req, res, next) => {
    try {
      const group = getGroup(req.params.id);

      if (!group) {
        throw createHttpError(404, "Group not found");
      }

      res.json({ group });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createGroupsRouter;
