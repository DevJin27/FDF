import { AppError } from "../lib/errors";
import { AuthenticatedUser } from "../lib/domain";
import { MatchRoomRepository } from "../repositories/match-room-repository";
import { OrderIntentRepository } from "../repositories/order-intent-repository";
import { DomainEventBus } from "./domain-event-bus";

export class MatchRoomService {
  constructor(
    private readonly roomRepository: MatchRoomRepository,
    private readonly intentRepository: OrderIntentRepository,
    private readonly eventBus: DomainEventBus
  ) {}

  async getCurrentForUser(userId: string) {
    return await this.roomRepository.getCurrentForUser(userId);
  }

  async getById(roomId: string) {
    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new AppError(404, "Match room not found", "MATCH_NOT_FOUND");
    }

    const settlement = await this.roomRepository.getSettlementView(roomId);

    return {
      room,
      settlement
    };
  }

  async lockRoom(user: AuthenticatedUser, roomId: string) {
    const room = await this.roomRepository.findById(roomId);

    if (!room) {
      throw new AppError(404, "Match room not found", "MATCH_NOT_FOUND");
    }

    if (room.leaderUserId !== user.id) {
      throw new AppError(403, "Only the leader can lock this room", "FORBIDDEN");
    }

    if (room.status !== "active") {
      throw new AppError(409, "Only active rooms can be locked", "INVALID_ROOM_STATE");
    }

    const lockedRoom = await this.roomRepository.lockRoom(roomId);
    if (!lockedRoom) {
      throw new AppError(409, "Unable to lock room", "ROOM_LOCK_FAILED");
    }

    const members = await this.roomRepository.listMembers(roomId);
    await this.intentRepository.markMatched(
      members.map((member) => member.orderIntentId),
      roomId,
      "matched"
    );
    await this.eventBus.emit("match.locked", {
      roomId,
      leaderUserId: user.id
    });

    return lockedRoom;
  }
}
