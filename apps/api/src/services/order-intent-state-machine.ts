import { AppError } from "../lib/errors";
import { OrderIntentStatus } from "../lib/domain";

const transitions: Record<OrderIntentStatus, ReadonlySet<OrderIntentStatus>> = {
  open: new Set(["reserved", "cancelled", "expired"]),
  reserved: new Set(["matched", "expired", "cancelled"]),
  matched: new Set(["expired"]),
  cancelled: new Set([]),
  expired: new Set([])
} as const;

export class OrderIntentStateMachine {
  transition(from: OrderIntentStatus, to: OrderIntentStatus) {
    if (from === to) {
      return to;
    }

    if (!transitions[from]?.has(to)) {
      throw new AppError(
        409,
        `Cannot transition intent from ${from} to ${to}`,
        "INVALID_INTENT_TRANSITION"
      );
    }

    return to;
  }
}
