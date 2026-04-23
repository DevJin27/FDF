const test = require("node:test");
const assert = require("node:assert/strict");

const state = require("../server/state");
const splitService = require("../server/services/splitService");
const cartService = require("../server/services/cartService");

function resetGroups() {
  const groups = state.getGroups();

  Object.keys(groups).forEach((groupId) => {
    delete groups[groupId];
  });

  state.saveState();
}

function createBaseGroup({
  id = "GROUP1",
  hostId = "u1",
  hostName = "Host User",
  participants,
  deliveryFee = 40,
  upiId = "host@upi",
  cart = [],
} = {}) {
  const nextParticipants =
    participants ||
    [
      { id: "u1", name: "Host User" },
      { id: "u2", name: "Aarav" },
      { id: "u3", name: "Mira" },
    ];

  return state.createGroup({
    id,
    code: id,
    name: "Test Group",
    address: "Campus",
    hostId,
    hostName,
    status: "open",
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    warningSentAt: null,
    participants: nextParticipants,
    cart,
    deliveryFee,
    settlement: {
      upiId,
      hostName,
      payments: {},
    },
  });
}

function makeItem({ id, displayName, pricePerUnit, contributions }) {
  const totalQty = contributions.reduce((sum, contribution) => sum + contribution.qty, 0);

  return {
    id,
    displayName,
    normalizedName: cartService.normalizeName(displayName),
    pricePerUnit,
    contributions,
    totalQty,
    totalPrice: Number((totalQty * pricePerUnit).toFixed(2)),
  };
}

test.beforeEach(() => {
  resetGroups();
});

test.after(() => {
  resetGroups();
});

test("calculateSplit keeps totals intact across 3 users and gives host the delivery remainder", () => {
  createBaseGroup({
    cart: [
      makeItem({
        id: "i1",
        displayName: "Item 1",
        pricePerUnit: 100,
        contributions: [{ userId: "u1", qty: 1 }],
      }),
      makeItem({
        id: "i2",
        displayName: "Item 2",
        pricePerUnit: 100,
        contributions: [{ userId: "u2", qty: 1 }],
      }),
      makeItem({
        id: "i3",
        displayName: "Item 3",
        pricePerUnit: 100,
        contributions: [{ userId: "u3", qty: 1 }],
      }),
    ],
  });

  const split = splitService.calculateSplit("GROUP1");
  const host = split.participants.find((participant) => participant.userId === "u1");
  const userTwo = split.participants.find((participant) => participant.userId === "u2");
  const userThree = split.participants.find((participant) => participant.userId === "u3");

  assert.equal(split.cartTotal, "300.00");
  assert.equal(split.deliveryFee, "40.00");
  assert.equal(split.grandTotal, "340.00");
  assert.equal(host.deliveryShare, "14.00");
  assert.equal(userTwo.deliveryShare, "13.00");
  assert.equal(userThree.deliveryShare, "13.00");
  assert.equal(host.owesAmount, null);
  assert.equal(host.upiLink, null);
  assert.equal(userTwo.owesAmount, "113.00");
  assert.equal(userThree.owesAmount, "113.00");
  assert.equal(
    split.participants.reduce((sum, participant) => sum + Number(participant.grandTotal), 0).toFixed(2),
    "340.00",
  );
});

test("participants with zero items still pay delivery and missing UPI yields null links", () => {
  createBaseGroup({
    upiId: "",
    cart: [
      makeItem({
        id: "i1",
        displayName: "Host Item",
        pricePerUnit: 90,
        contributions: [{ userId: "u1", qty: 1 }],
      }),
      makeItem({
        id: "i2",
        displayName: "Guest Item",
        pricePerUnit: 110,
        contributions: [{ userId: "u2", qty: 1 }],
      }),
    ],
  });

  const split = splitService.calculateSplit("GROUP1");
  const zeroItemUser = split.participants.find((participant) => participant.userId === "u3");

  assert.equal(zeroItemUser.itemsTotal, "0.00");
  assert.equal(zeroItemUser.deliveryShare, "13.00");
  assert.equal(zeroItemUser.grandTotal, "13.00");
  assert.equal(zeroItemUser.owesAmount, "13.00");
  assert.equal(zeroItemUser.upiLink, null);
});

test("delivery remainder and summary are calculated correctly", () => {
  createBaseGroup({
    deliveryFee: 10,
    cart: [
      makeItem({
        id: "i1",
        displayName: "Notebook",
        pricePerUnit: 60,
        contributions: [{ userId: "u1", qty: 1 }],
      }),
      makeItem({
        id: "i2",
        displayName: "Pens",
        pricePerUnit: 30,
        contributions: [{ userId: "u2", qty: 1 }],
      }),
      makeItem({
        id: "i3",
        displayName: "Snacks",
        pricePerUnit: 10,
        contributions: [{ userId: "u3", qty: 1 }],
      }),
    ],
  });

  const split = splitService.calculateSplit("GROUP1");
  const summary = splitService.getSplitSummary("GROUP1");

  assert.deepEqual(
    split.participants.map((participant) => participant.deliveryShare),
    ["4.00", "3.00", "3.00"],
  );
  assert.equal(summary.breakdown.length, 2);
  assert.equal(summary.breakdown.every((entry) => entry.name !== "Host User"), true);
  assert.equal(summary.hostCollects, "46.00");
});

test("single-user groups owe nothing and zero delivery stays zeroed", () => {
  createBaseGroup({
    id: "SOLO",
    deliveryFee: 0,
    participants: [{ id: "u1", name: "Solo Host" }],
    cart: [
      makeItem({
        id: "i1",
        displayName: "Only Item",
        pricePerUnit: 75,
        contributions: [{ userId: "u1", qty: 1 }],
      }),
    ],
  });

  const split = splitService.calculateSplit("SOLO");

  assert.equal(split.participants.length, 1);
  assert.equal(split.deliveryFee, "0.00");
  assert.equal(split.grandTotal, "75.00");
  assert.equal(split.participants[0].deliveryShare, "0.00");
  assert.equal(split.participants[0].owesAmount, null);
  assert.equal(split.participants[0].owesTo, null);
});

test("duplicate detection returns exact and normalized matches with high confidence", () => {
  createBaseGroup({
    cart: [
      makeItem({
        id: "i1",
        displayName: "Amul Butter (500g)",
        pricePerUnit: 56,
        contributions: [{ userId: "u1", qty: 1 }],
      }),
    ],
  });

  const match = cartService.getPotentialMatch({
    groupId: "GROUP1",
    itemName: "  amul butter 500 g!!! ",
  });

  assert.equal(match.confidence, "high");
  assert.equal(match.match.displayName, "Amul Butter (500g)");
});

test("duplicate detection returns contains matches and ignores unrelated items", () => {
  createBaseGroup({
    cart: [
      makeItem({
        id: "i1",
        displayName: "Coca Cola",
        pricePerUnit: 40,
        contributions: [{ userId: "u1", qty: 1 }],
      }),
      makeItem({
        id: "i2",
        displayName: "Bread",
        pricePerUnit: 30,
        contributions: [{ userId: "u2", qty: 1 }],
      }),
    ],
  });

  const containsMatch = cartService.getPotentialMatch({
    groupId: "GROUP1",
    itemName: "coca cola zero",
  });
  const noMatch = cartService.getPotentialMatch({
    groupId: "GROUP1",
    itemName: "Organic Bananas",
  });

  assert.equal(containsMatch.confidence, "high");
  assert.equal(containsMatch.match.displayName, "Coca Cola");
  assert.equal(noMatch.confidence, "none");
  assert.equal(noMatch.match, null);
});
