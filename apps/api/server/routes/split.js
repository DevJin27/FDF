const express = require("express");
const { getGroup } = require("../state");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function createSplitRouter() {
  const router = express.Router();

  router.get("/:groupId", (req, res, next) => {
    try {
      const group = getGroup(req.params.groupId);

      if (!group) {
        throw createHttpError(404, "Group not found");
      }

      res.status(501).json({
        message: "Split calculation is not implemented yet. Gargi will own this endpoint.",
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createSplitRouter;
