import { z } from "zod";

import { Clock } from "../lib/clock";
import { AppError } from "../lib/errors";
import { DELIVERY_CLUSTERS, DeliveryCluster } from "../lib/domain";
import { AuthenticatedUser } from "../lib/domain";
import { OrderIntentRepository } from "../repositories/order-intent-repository";
import { MatchmakingService } from "./matchmaking-service";
import { DomainEventBus } from "./domain-event-bus";

const createIntentSchema = z.object({
  amount: z.number().positive(),
  latestCheckoutAt: z.string().datetime(),
  deliveryCluster: z.enum(DELIVERY_CLUSTERS)
});

export class OrderIntentService {
  constructor(
    private readonly repository: OrderIntentRepository,
    private readonly matchmakingService: MatchmakingService,
    private readonly eventBus: DomainEventBus,
    private readonly clock: Clock,
    private readonly minimumAmount: number
  ) {}

  async createIntent(user: AuthenticatedUser, input: unknown) {
    const parsed = createIntentSchema.parse(input);
    const latestCheckoutAt = new Date(parsed.latestCheckoutAt);

    if (latestCheckoutAt.getTime() <= this.clock.now().getTime()) {
      throw new AppError(400, "Checkout deadline must be in the future", "INVALID_DEADLINE");
    }

    const intent = await this.repository.create({
      userId: user.id,
      amount: parsed.amount,
      latestCheckoutAt,
      deliveryCluster: parsed.deliveryCluster
    });

    await this.eventBus.emit("intent.created", { intent });
    await this.publishQueue(parsed.deliveryCluster);
    await this.matchmakingService.tryMatchCluster(parsed.deliveryCluster);
    await this.publishQueue(parsed.deliveryCluster);

    return intent;
  }

  async listMyIntents(userId: string) {
    return await this.repository.listForUser(userId);
  }

  async cancelIntent(userId: string, intentId: string) {
    const intent = await this.repository.cancel(intentId, userId);

    if (!intent) {
      throw new AppError(404, "Open intent not found", "INTENT_NOT_FOUND");
    }

    await this.eventBus.emit("intent.cancelled", {
      intentId: intent.id,
      cluster: intent.deliveryCluster
    });
    await this.publishQueue(intent.deliveryCluster);

    return intent;
  }

  async expireOpenIntents() {
    const expired = await this.repository.markExpiredOpenIntents(this.clock.now());

    for (const intent of expired) {
      await this.publishQueue(intent.deliveryCluster as DeliveryCluster);
    }

    return expired;
  }

  async publishQueue(cluster: DeliveryCluster) {
    const snapshot = await this.repository.getQueueSnapshot(
      cluster,
      this.minimumAmount,
      this.clock.now()
    );

    await this.eventBus.emit("queue.updated", {
      cluster,
      snapshot
    });
  }
}
