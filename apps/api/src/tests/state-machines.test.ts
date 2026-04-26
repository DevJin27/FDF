import assert from "node:assert/strict";
import test from "node:test";

import { MatchRoomStateMachine } from "../services/match-room-state-machine";
import { OrderIntentStateMachine } from "../services/order-intent-state-machine";

test("order intent state machine accepts valid transitions", () => {
  const machine = new OrderIntentStateMachine();

  assert.equal(machine.transition("open", "reserved"), "reserved");
  assert.equal(machine.transition("reserved", "matched"), "matched");
});

test("order intent state machine rejects invalid transitions", () => {
  const machine = new OrderIntentStateMachine();

  assert.throws(() => machine.transition("cancelled", "open"));
});

test("match room state machine accepts valid transitions", () => {
  const machine = new MatchRoomStateMachine();

  assert.equal(machine.transition("active", "locked"), "locked");
  assert.equal(machine.transition("locked", "completed"), "completed");
});

test("match room state machine rejects invalid transitions", () => {
  const machine = new MatchRoomStateMachine();

  assert.throws(() => machine.transition("expired", "active"));
});
