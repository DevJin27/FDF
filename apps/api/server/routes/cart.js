const express = require("express");
const cartService = require("../services/cartService");

function createCartRouter({ io }) {
  const router = express.Router();

  function emitCartUpdated(groupId, cart, totals) {
    io.to(groupId).emit("cart_updated", {
      cart,
      totals,
    });
  }

  router.post("/add", (req, res, next) => {
    try {
      const result = cartService.addItem(req.body || {});

      emitCartUpdated(req.body.groupId, result.cart, result.totals);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/remove", (req, res, next) => {
    try {
      const result = cartService.removeItem(req.body || {});

      emitCartUpdated(req.body.groupId, result.cart, result.totals);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:groupId", (req, res, next) => {
    try {
      res.json(cartService.getCart(req.params.groupId));
    } catch (error) {
      next(error);
    }
  });

  router.post("/check-duplicate", (req, res, next) => {
    try {
      res.json(cartService.getPotentialMatch(req.body || {}));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createCartRouter;
