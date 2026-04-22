const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getGroup, updateGroup } = require("../state");

const UNIT_PATTERN =
  /\b\d+(?:\.\d+)?\s?(?:kg|kgs|g|gm|gms|gram|grams|l|ltr|ltrs|litre|litres|liter|liters|ml|pack|packs|pc|pcs|piece|pieces)\b/gi;

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeItemName(itemName) {
  return String(itemName)
    .toLowerCase()
    .replace(UNIT_PATTERN, " ")
    .replace(/[()\-_,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(left, right) {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let col = 0; col < cols; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
    }
  }

  return matrix[left.length][right.length];
}

function recalculateItem(item) {
  const totalQty = item.contributions.reduce((sum, contribution) => sum + contribution.qty, 0);

  return {
    ...item,
    totalQty,
    totalPrice: Number((totalQty * item.pricePerUnit).toFixed(2)),
  };
}

function getCartTotals(cart) {
  return cart.reduce(
    (totals, item) => ({
      itemCount: totals.itemCount + 1,
      totalUnits: totals.totalUnits + item.totalQty,
      cartTotal: Number((totals.cartTotal + item.totalPrice).toFixed(2)),
    }),
    {
      itemCount: 0,
      totalUnits: 0,
      cartTotal: 0,
    },
  );
}

function findPotentialMatch(cart, normalizedName) {
  return (
    cart.find((item) => item.normalizedName === normalizedName) ||
    cart.find((item) => levenshteinDistance(item.normalizedName, normalizedName) <= 2) ||
    null
  );
}

function ensureGroupIsMutable(group) {
  if (!group) {
    throw createHttpError(404, "Group not found");
  }

  if (Date.now() >= group.expiresAt) {
    updateGroup(group.id, { status: "locked" });
    throw createHttpError(400, "Group has expired");
  }

  if (group.status !== "open") {
    throw createHttpError(400, "Group is locked");
  }
}

function createCartRouter({ io }) {
  const router = express.Router();

  function emitCartUpdated(group) {
    io.to(group.id).emit("cart_updated", {
      cart: group.cart,
      totals: getCartTotals(group.cart),
    });
  }

  router.post("/add", (req, res, next) => {
    try {
      const { groupId, userId, itemName, pricePerUnit, qty } = req.body || {};

      if (!groupId || !userId || !itemName || !pricePerUnit || !qty) {
        throw createHttpError(400, "groupId, userId, itemName, pricePerUnit, and qty are required");
      }

      const group = getGroup(groupId);
      ensureGroupIsMutable(group);

      const parsedPrice = Number(pricePerUnit);
      const parsedQty = Number(qty);

      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        throw createHttpError(400, "pricePerUnit must be a positive number");
      }

      if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
        throw createHttpError(400, "qty must be a positive integer");
      }

      const normalizedName = normalizeItemName(itemName);

      if (!normalizedName) {
        throw createHttpError(400, "itemName is invalid");
      }

      let itemResponse = null;
      let merged = false;

      const nextGroup = updateGroup(group.id, (currentGroup) => {
        const matchedItem = findPotentialMatch(currentGroup.cart, normalizedName);
        merged = Boolean(matchedItem);

        const nextCart = currentGroup.cart.map((item) => {
          if (!matchedItem || item.id !== matchedItem.id) {
            return item;
          }

          const contributionIndex = item.contributions.findIndex((contribution) => contribution.userId === userId);
          const contributions =
            contributionIndex >= 0
              ? item.contributions.map((contribution, index) =>
                  index === contributionIndex
                    ? {
                        ...contribution,
                        qty: contribution.qty + parsedQty,
                      }
                    : contribution,
                )
              : [...item.contributions, { userId, qty: parsedQty }];

          itemResponse = recalculateItem({
            ...item,
            contributions,
          });

          return itemResponse;
        });

        if (!matchedItem) {
          itemResponse = recalculateItem({
            id: uuidv4(),
            displayName: String(itemName).trim(),
            normalizedName,
            pricePerUnit: parsedPrice,
            contributions: [{ userId, qty: parsedQty }],
          });

          nextCart.push(itemResponse);
        }

        return {
          ...currentGroup,
          cart: nextCart,
        };
      });

      emitCartUpdated(nextGroup);

      res.status(201).json({
        item: itemResponse,
        merged,
        cart: nextGroup.cart,
        totals: getCartTotals(nextGroup.cart),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/remove", (req, res, next) => {
    try {
      const { groupId, userId, itemId } = req.body || {};

      if (!groupId || !userId || !itemId) {
        throw createHttpError(400, "groupId, userId, and itemId are required");
      }

      const group = getGroup(groupId);
      ensureGroupIsMutable(group);

      const existingItem = group.cart.find((item) => item.id === itemId);

      if (!existingItem) {
        throw createHttpError(404, "Item not found");
      }

      const ownsContribution = existingItem.contributions.some((contribution) => contribution.userId === userId);
      if (!ownsContribution) {
        throw createHttpError(404, "Contribution not found for user");
      }

      const nextGroup = updateGroup(group.id, (currentGroup) => {
        const nextCart = currentGroup.cart
          .map((item) => {
            if (item.id !== itemId) {
              return item;
            }

            const contributions = item.contributions.filter((contribution) => contribution.userId !== userId);

            if (contributions.length === 0) {
              return null;
            }

            return recalculateItem({
              ...item,
              contributions,
            });
          })
          .filter(Boolean);

        return {
          ...currentGroup,
          cart: nextCart,
        };
      });

      emitCartUpdated(nextGroup);

      res.json({
        cart: nextGroup.cart,
        totals: getCartTotals(nextGroup.cart),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:groupId", (req, res, next) => {
    try {
      const group = getGroup(req.params.groupId);

      if (!group) {
        throw createHttpError(404, "Group not found");
      }

      res.json({
        cart: group.cart,
        totals: getCartTotals(group.cart),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/check-duplicate", (req, res, next) => {
    try {
      const { groupId, itemName } = req.body || {};

      if (!groupId || !itemName) {
        throw createHttpError(400, "groupId and itemName are required");
      }

      const group = getGroup(groupId);
      if (!group) {
        throw createHttpError(404, "Group not found");
      }

      res.status(501).json({
        match: null,
        confidence: "none",
        message: "Duplicate-check route shell is ready for Parrv's implementation.",
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createCartRouter;
