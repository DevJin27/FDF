import { AppError } from "../lib/errors";
import { MatchRoomStatus } from "../lib/domain";

const transitions: Record<MatchRoomStatus, ReadonlySet<MatchRoomStatus>> = {
  pending_confirmation: new Set(["active", "cancelled", "expired"]),
  active: new Set(["locked", "cancelled", "expired"]),
  locked: new Set(["completed", "expired"]),
  completed: new Set([]),
  cancelled: new Set([]),
  expired: new Set([])
};

export class MatchRoomStateMachine {
  transition(from: MatchRoomStatus, to: MatchRoomStatus) {
    if (from === to) {
      return to;
    }

    if (!transitions[from].has(to)) {
      throw new AppError(
        409,
        `Cannot transition room from ${from} to ${to}`,
        "INVALID_ROOM_TRANSITION"
      );
    }

    return to;
  }
}
