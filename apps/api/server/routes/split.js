const express = require("express");
const splitService = require("../services/splitService");

function createSplitRouter() {
  const router = express.Router();

  router.get("/:groupId", (req, res, next) => {
    try {
      res.json(splitService.calculateSplit(req.params.groupId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:groupId/summary", (req, res, next) => {
    try {
      res.json(splitService.getSplitSummary(req.params.groupId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createSplitRouter;
