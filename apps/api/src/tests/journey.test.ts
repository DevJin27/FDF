import assert from "node:assert/strict";
import test from "node:test";

import { SystemClock } from "../lib/clock";
import { DomainEventMap, OrderIntentSummary } from "../lib/domain";
import { DomainEventBus, DomainEventSubscriber } from "../services/domain-event-bus";
import { MatchmakingService } from "../services/matchmaking-service";
import { MatchRoomService } from "../services/match-room-service";
import { SettlementService } from "../services/settlement-service";

class RecordingSubscriber implements DomainEventSubscriber {
  readonly events: Array<{ name: keyof DomainEventMap; payload: unknown }> = [];

  onEvent<K extends keyof DomainEventMap>(name: K, payload: DomainEventMap[K]) {
    this.events.push({ name, payload });
  }
}

class FakeOrderIntentRepository {
  constructor(readonly intents: OrderIntentSummary[]) {}

  async listOpenByCluster() {
    return this.intents.filter((intent) => intent.status === "open");
  }

  async markMatched(intentIds: string[], roomId: string, status: "reserved" | "matched") {
    this.intents.forEach((intent) => {
      if (intentIds.includes(intent.id)) {
        intent.status = status;
        intent.roomId = roomId;
      }
    });

    return this.intents.filter((intent) => intentIds.includes(intent.id));
  }
}

class FakeMatchRoomRepository {
  room: {
    id: string;
    leaderUserId: string;
    memberCount: number;
    totalAmount: number;
    minimumAmount: number;
    latestCheckoutAt: string;
    status: "active" | "locked";
    deliveryCluster: "hostel-a";
    createdAt: string;
  } | null = null;

  members = [
    {
      userId: "u1",
      orderIntentId: "i1",
      amount: 160,
      name: "Aditi",
      image: null
    },
    {
      userId: "u2",
      orderIntentId: "i2",
      amount: 50,
      name: "Ravi",
      image: null
    }
  ];

  settlement = {
    leader: {
      userId: "u1",
      name: "Aditi",
      upiId: "aditi@upi"
    },
    members: [
      {
        userId: "u1",
        name: "Aditi",
        image: null,
        amountOwed: 160,
        paymentStatus: "paid" as const,
        upiId: "aditi@upi",
        isLeader: true
      },
      {
        userId: "u2",
        name: "Ravi",
        image: null,
        amountOwed: 50,
        paymentStatus: "pending" as const,
        upiId: null,
        isLeader: false
      }
    ]
  };

  async createFromIntents(input: {
    leaderUserId: string;
    deliveryCluster: "hostel-a";
    minimumAmount: number;
    totalAmount: number;
    latestCheckoutAt: Date;
    intentRows: Array<{ intentId: string; userId: string; amount: number }>;
  }) {
    this.room = {
      id: "room-1",
      leaderUserId: input.leaderUserId,
      memberCount: input.intentRows.length,
      totalAmount: input.totalAmount,
      minimumAmount: input.minimumAmount,
      latestCheckoutAt: input.latestCheckoutAt.toISOString(),
      status: "active",
      deliveryCluster: "hostel-a",
      createdAt: "2026-04-24T10:00:00.000Z"
    };

    return this.room;
  }

  async findById() {
    return this.room;
  }

  async lockRoom() {
    if (!this.room) {
      return null;
    }

    this.room = {
      ...this.room,
      status: "locked"
    };

    return this.room;
  }

  async listMembers() {
    return this.members;
  }

  async getSettlementView() {
    return this.settlement;
  }

  async getCurrentForUser() {
    return this.room;
  }
}

class FakeSettlementRepository {
  constructor(private readonly roomRepository: FakeMatchRoomRepository) {}

  async markPaid(input: { memberUserId: string }) {
    const member = this.roomRepository.settlement.members.find(
      (entry) => entry.userId === input.memberUserId
    );

    if (!member) {
      return null;
    }

    member.paymentStatus = "paid";
    return member;
  }
}

test("journey flow forms a room, locks it, and marks payment", async () => {
  const intents: OrderIntentSummary[] = [
    {
      id: "i1",
      userId: "u1",
      amount: 160,
      latestCheckoutAt: "2026-04-24T11:15:00.000Z",
      deliveryCluster: "hostel-a",
      status: "open",
      createdAt: "2026-04-24T10:00:00.000Z",
      roomId: null
    },
    {
      id: "i2",
      userId: "u2",
      amount: 50,
      latestCheckoutAt: "2026-04-24T11:20:00.000Z",
      deliveryCluster: "hostel-a",
      status: "open",
      createdAt: "2026-04-24T10:01:00.000Z",
      roomId: null
    }
  ];

  const orderIntentRepository = new FakeOrderIntentRepository(intents);
  const roomRepository = new FakeMatchRoomRepository();
  const eventBus = new DomainEventBus();
  const subscriber = new RecordingSubscriber();
  eventBus.subscribe(subscriber);

  const matchmakingService = new MatchmakingService(
    orderIntentRepository as never,
    roomRepository as never,
    eventBus,
    new SystemClock(),
    {
      minimumAmount: 200,
      compatibilityWindowMinutes: 15
    }
  );

  const room = await matchmakingService.tryMatchCluster("hostel-a");
  assert.ok(room);
  assert.equal(room.leaderUserId, "u1");
  assert.equal(intents[0].status, "reserved");
  assert.equal(intents[1].status, "reserved");

  const matchRoomService = new MatchRoomService(
    roomRepository as never,
    orderIntentRepository as never,
    eventBus
  );

  const lockedRoom = await matchRoomService.lockRoom(
    {
      id: "u1",
      email: "aditi@example.com",
      name: "Aditi",
      image: null
    },
    room.id
  );

  assert.equal(lockedRoom.status, "locked");
  assert.equal(intents[0].status, "matched");
  assert.equal(intents[1].status, "matched");

  const settlementService = new SettlementService(
    roomRepository as never,
    new FakeSettlementRepository(roomRepository) as never,
    eventBus
  );

  const settlement = await settlementService.markPaid(
    {
      id: "u1",
      email: "aditi@example.com",
      name: "Aditi",
      image: null
    },
    room.id,
    "u2"
  );

  assert.ok(settlement);
  assert.equal(
    settlement?.members.find((member) => member.userId === "u2")?.paymentStatus,
    "paid"
  );
  assert.deepEqual(
    subscriber.events.map((event) => event.name),
    ["match.formed", "match.locked", "payment.updated"]
  );
});
