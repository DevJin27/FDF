const express = require("express");
const groupService = require("../services/groupService");
const { getGroup } = require("../state");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function createGroupsRouter() {
  const router = express.Router();

  // POST /  →  create a new group
  router.post("/", (req, res, next) => {
    try {
      const { name, address, hostId, hostName } = req.body || {};

      if (!name || !address || !hostId || !hostName) {
        throw createHttpError(400, "name, address, hostId, and hostName are required");
      }

      const group = groupService.createGroup({ name, address, hostId, hostName });

      res.status(201).json({
        groupId: group.id,
        code: group.code,
        group,
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /join  →  join an existing group by code
  router.post("/join", (req, res, next) => {
    try {
      const { code, userId, userName } = req.body || {};

      if (!code || !userId || !userName) {
        throw createHttpError(400, "code, userId, and userName are required");
      }

      const group = groupService.joinGroup({ code, userId, userName });
      res.json({ group });
    } catch (error) {
      next(error);
    }
  });

  // GET /:id  →  fetch group snapshot
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

  // POST /:id/lock  →  host locks the group
  router.post("/:id/lock", (req, res, next) => {
    try {
      const { userId } = req.body || {};
      const group = getGroup(req.params.id);

      if (!group) {
        throw createHttpError(404, "Group not found");
      }

      if (userId !== group.hostId) {
        throw createHttpError(403, "Only host can lock group");
      }

      groupService.lockGroup(req.params.id);
      res.json({ status: "locked" });
    } catch (error) {
      next(error);
    }
  });

  // POST /:id/upi  →  host sets UPI ID for settlement
  router.post("/:id/upi", (req, res, next) => {
    try {
      const { upiId, hostName, userId } = req.body || {};
      const group = getGroup(req.params.id);

      if (!group) {
        throw createHttpError(404, "Group not found");
      }

      if (userId !== group.hostId) {
        throw createHttpError(403, "Only host can set UPI ID");
      }

      groupService.setUpiId({ groupId: req.params.id, upiId, hostName });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  // POST /:id/paid  →  mark a member as paid
  router.post("/:id/paid", (req, res, next) => {
    try {
      const { userId } = req.body || {};
      const group = getGroup(req.params.id);

      if (!group) {
        throw createHttpError(404, "Group not found");
      }

      groupService.markPaid({ groupId: req.params.id, userId });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createGroupsRouter;
