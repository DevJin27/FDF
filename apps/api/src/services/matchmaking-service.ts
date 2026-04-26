import { Clock } from "../lib/clock";
import { DeliveryCluster, OrderIntentSummary } from "../lib/domain";
import { formatMoney } from "../lib/money";
import { MatchRoomRepository } from "../repositories/match-room-repository";
import { OrderIntentRepository } from "../repositories/order-intent-repository";
import { DomainEventBus } from "./domain-event-bus";

export interface MatcherConfig {
  minimumAmount: number;
  compatibilityWindowMinutes: number;
}

export interface SelectedMatch {
  intentIds: string[];
  totalAmount: number;
  leaderUserId: string;
  latestCheckoutAt: Date;
  userIds: string[];
}

function isCompatibleSet(intents: OrderIntentSummary[], windowMinutes: number) {
  if (intents.length <= 1) {
    return true;
  }

  const timestamps = intents.map((intent) => new Date(intent.latestCheckoutAt).getTime());
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  return max - min <= windowMinutes * 60 * 1000;
}

function getSetDeadline(intents: OrderIntentSummary[]) {
  return new Date(
    Math.min(...intents.map((intent) => new Date(intent.latestCheckoutAt).getTime()))
  );
}

function compareCandidateSets(
  left: OrderIntentSummary[],
  right: OrderIntentSummary[],
  minimumAmount: number
) {
  const leftTotal = left.reduce((sum, intent) => sum + intent.amount, 0);
  const rightTotal = right.reduce((sum, intent) => sum + intent.amount, 0);
  const leftGap = leftTotal - minimumAmount;
  const rightGap = rightTotal - minimumAmount;

  if (leftGap !== rightGap) {
    return leftGap - rightGap;
  }

  const leftDeadline = getSetDeadline(left).getTime();
  const rightDeadline = getSetDeadline(right).getTime();

  if (leftDeadline !== rightDeadline) {
    return leftDeadline - rightDeadline;
  }

  if (left.length !== right.length) {
    return left.length - right.length;
  }

  const leftCreated = left.map((intent) => new Date(intent.createdAt).getTime()).sort((a, b) => a - b);
  const rightCreated = right.map((intent) => new Date(intent.createdAt).getTime()).sort((a, b) => a - b);

  for (let index = 0; index < Math.min(leftCreated.length, rightCreated.length); index += 1) {
    if (leftCreated[index] !== rightCreated[index]) {
      return leftCreated[index] - rightCreated[index];
    }
  }

  return 0;
}

export function selectBestMatch(
  intents: OrderIntentSummary[],
  config: MatcherConfig
): SelectedMatch | null {
  let best: OrderIntentSummary[] | null = null;

  function explore(startIndex: number, current: OrderIntentSummary[]) {
    const total = current.reduce((sum, intent) => sum + intent.amount, 0);

    if (total >= config.minimumAmount && isCompatibleSet(current, config.compatibilityWindowMinutes)) {
      if (!best || compareCandidateSets(current, best, config.minimumAmount) < 0) {
        best = [...current];
      }
    }

    for (let index = startIndex; index < intents.length; index += 1) {
      const next = [...current, intents[index]];
      if (!isCompatibleSet(next, config.compatibilityWindowMinutes)) {
        continue;
      }

      explore(index + 1, next);
    }
  }

  explore(0, []);

  if (!best) {
    return null;
  }

  const selected = best as OrderIntentSummary[];

  const totalAmount = formatMoney(selected.reduce((sum, intent) => sum + intent.amount, 0));
  const leader = [...selected].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  )[0];

  return {
    intentIds: selected.map((intent) => intent.id),
    totalAmount,
    leaderUserId: leader.userId,
    latestCheckoutAt: getSetDeadline(selected),
    userIds: selected.map((intent) => intent.userId)
  };
}

export class MatchmakingService {
  constructor(
    private readonly intentRepository: OrderIntentRepository,
    private readonly roomRepository: MatchRoomRepository,
    private readonly eventBus: DomainEventBus,
    private readonly clock: Clock,
    private readonly config: MatcherConfig
  ) {}

  async tryMatchCluster(cluster: DeliveryCluster) {
    const openIntents = await this.intentRepository.listOpenByCluster(cluster, this.clock.now());
    const selected = selectBestMatch(openIntents, this.config);

    if (!selected) {
      return null;
    }

    const room = await this.roomRepository.createFromIntents({
      leaderUserId: selected.leaderUserId,
      deliveryCluster: cluster,
      minimumAmount: this.config.minimumAmount,
      totalAmount: selected.totalAmount,
      latestCheckoutAt: selected.latestCheckoutAt,
      intentRows: openIntents
        .filter((intent) => selected.intentIds.includes(intent.id))
        .map((intent) => ({
          intentId: intent.id,
          userId: intent.userId,
          amount: intent.amount
        }))
    });

    await this.intentRepository.markMatched(selected.intentIds, room.id, "reserved");
    await this.eventBus.emit("match.formed", {
      roomId: room.id,
      userIds: selected.userIds,
      cluster
    });

    return room;
  }
}
