import { AppError } from "../lib/errors";
import { AuthenticatedUser } from "../lib/domain";
import { MatchRoomRepository } from "../repositories/match-room-repository";
import { SettlementRepository } from "../repositories/settlement-repository";
import { DomainEventBus } from "./domain-event-bus";

export class SettlementService {
  constructor(
    private readonly roomRepository: MatchRoomRepository,
    private readonly settlementRepository: SettlementRepository,
    private readonly eventBus: DomainEventBus
  ) {}

  async markPaid(user: AuthenticatedUser, roomId: string, memberUserId: string) {
    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new AppError(404, "Match room not found", "MATCH_NOT_FOUND");
    }

    if (room.leaderUserId !== user.id) {
      throw new AppError(403, "Only the leader can mark payments", "FORBIDDEN");
    }

    const settlement = await this.settlementRepository.markPaid({
      roomId,
      memberUserId,
      markedByUserId: user.id
    });

    if (!settlement) {
      throw new AppError(404, "Settlement not found", "SETTLEMENT_NOT_FOUND");
    }

    await this.eventBus.emit("payment.updated", {
      roomId,
      memberUserId
    });

    return await this.roomRepository.getSettlementView(roomId);
  }
}
