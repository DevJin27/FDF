import { Clock } from "../lib/clock";
import { MatchRoomRepository } from "../repositories/match-room-repository";
import { OrderIntentRepository } from "../repositories/order-intent-repository";
import { DeliveryCluster } from "../lib/domain";
import { DomainEventBus } from "./domain-event-bus";
import { OrderIntentService } from "./order-intent-service";

export class ExpiryService {
  constructor(
    private readonly orderIntentRepository: OrderIntentRepository,
    private readonly matchRoomRepository: MatchRoomRepository,
    private readonly orderIntentService: OrderIntentService,
    private readonly eventBus: DomainEventBus,
    private readonly clock: Clock
  ) {}

  async run() {
    const now = this.clock.now();
    const expiredOpen = await this.orderIntentRepository.markExpiredOpenIntents(now);
    const expiredRooms = await this.matchRoomRepository.expireActiveRooms(now);

    for (const intent of expiredOpen) {
      await this.orderIntentService.publishQueue(intent.deliveryCluster as DeliveryCluster);
    }

    for (const room of expiredRooms) {
      await this.orderIntentRepository.markExpiredByRoom(room.id, now);
      await this.orderIntentService.publishQueue(room.deliveryCluster);
      await this.eventBus.emit("match.updated", {
        roomId: room.id
      });
    }
  }
}
