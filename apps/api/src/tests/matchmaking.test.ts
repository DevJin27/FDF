import assert from "node:assert/strict";
import test from "node:test";

import { selectBestMatch } from "../services/matchmaking-service";
import { OrderIntentSummary } from "../lib/domain";

function makeIntent(
  id: string,
  amount: number,
  latestCheckoutAt: string,
  createdAt: string,
  deliveryCluster = "hostel-a"
): OrderIntentSummary {
  return {
    id,
    userId: `user-${id}`,
    amount,
    latestCheckoutAt,
    deliveryCluster: deliveryCluster as OrderIntentSummary["deliveryCluster"],
    status: "open",
    createdAt,
    roomId: null
  };
}

const config = {
  minimumAmount: 200,
  compatibilityWindowMinutes: 15
};

test("matcher finds an exact threshold hit", () => {
  const match = selectBestMatch(
    [
      makeIntent("a", 120, "2026-04-25T12:00:00.000Z", "2026-04-25T10:00:00.000Z"),
      makeIntent("b", 80, "2026-04-25T12:05:00.000Z", "2026-04-25T10:01:00.000Z"),
      makeIntent("c", 70, "2026-04-25T12:06:00.000Z", "2026-04-25T10:02:00.000Z")
    ],
    config
  );

  assert.ok(match);
  assert.equal(match.totalAmount, 200);
  assert.deepEqual(match.intentIds.sort(), ["a", "b"]);
});

test("matcher prefers the smallest amount above threshold", () => {
  const match = selectBestMatch(
    [
      makeIntent("a", 150, "2026-04-25T12:00:00.000Z", "2026-04-25T10:00:00.000Z"),
      makeIntent("b", 60, "2026-04-25T12:05:00.000Z", "2026-04-25T10:01:00.000Z"),
      makeIntent("c", 55, "2026-04-25T12:06:00.000Z", "2026-04-25T10:02:00.000Z")
    ],
    config
  );

  assert.ok(match);
  assert.deepEqual(match.intentIds.sort(), ["a", "c"]);
  assert.equal(match.totalAmount, 205);
});

test("matcher rejects deadline-incompatible combinations", () => {
  const match = selectBestMatch(
    [
      makeIntent("a", 150, "2026-04-25T12:00:00.000Z", "2026-04-25T10:00:00.000Z"),
      makeIntent("b", 60, "2026-04-25T12:20:01.000Z", "2026-04-25T10:01:00.000Z")
    ],
    config
  );

  assert.equal(match, null);
});

test("matcher breaks ties with earliest deadline and fewer users", () => {
  const match = selectBestMatch(
    [
      makeIntent("a", 100, "2026-04-25T12:20:00.000Z", "2026-04-25T10:00:00.000Z"),
      makeIntent("b", 100, "2026-04-25T12:20:00.000Z", "2026-04-25T10:01:00.000Z"),
      makeIntent("c", 50, "2026-04-25T12:00:00.000Z", "2026-04-25T10:02:00.000Z"),
      makeIntent("d", 75, "2026-04-25T12:00:00.000Z", "2026-04-25T10:03:00.000Z"),
      makeIntent("e", 75, "2026-04-25T12:00:00.000Z", "2026-04-25T10:04:00.000Z")
    ],
    config
  );

  assert.ok(match);
  assert.deepEqual(match.intentIds.sort(), ["c", "d", "e"]);
});
