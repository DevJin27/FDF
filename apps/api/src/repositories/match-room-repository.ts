import { and, asc, eq, lte, or, sql } from "drizzle-orm";

import { getDb } from "../lib/db";
import {
  matchRoomMembers,
  matchRooms,
  settlements
} from "../db/schema/app";
import { users } from "../db/schema/auth";
import {
  DeliveryCluster,
  MatchRoomStatus,
  MatchRoomSummary,
  SettlementStatus,
  SettlementView
} from "../lib/domain";

function mapRoom(row: typeof matchRooms.$inferSelect): MatchRoomSummary {
  return {
    id: row.id,
    leaderUserId: row.leaderUserId,
    memberCount: 0,
    totalAmount: Number(row.totalAmount),
    minimumAmount: Number(row.minimumAmount),
    latestCheckoutAt: row.latestCheckoutAt.toISOString(),
    status: row.status as MatchRoomStatus,
    deliveryCluster: row.deliveryCluster as DeliveryCluster,
    createdAt: row.createdAt.toISOString()
  };
}

export class MatchRoomRepository {
  private readonly db = getDb();

  async createFromIntents(input: {
    leaderUserId: string;
    deliveryCluster: DeliveryCluster;
    minimumAmount: number;
    totalAmount: number;
    latestCheckoutAt: Date;
    intentRows: Array<{
      intentId: string;
      userId: string;
      amount: number;
    }>;
  }) {
    return await this.db.transaction(async (tx) => {
      const [room] = await tx
        .insert(matchRooms)
        .values({
          leaderUserId: input.leaderUserId,
          deliveryCluster: input.deliveryCluster,
          minimumAmount: input.minimumAmount,
          totalAmount: input.totalAmount,
          latestCheckoutAt: input.latestCheckoutAt,
          status: "active"
        })
        .returning();

      await tx.insert(matchRoomMembers).values(
        input.intentRows.map((row) => ({
          roomId: room.id,
          userId: row.userId,
          orderIntentId: row.intentId,
          amount: row.amount
        }))
      );

      await tx.insert(settlements).values(
        input.intentRows.map((row) => ({
          roomId: room.id,
          userId: row.userId,
          amountOwed: row.amount,
          status: row.userId === input.leaderUserId ? "paid" : "pending"
        }))
      );

      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(matchRoomMembers)
        .where(eq(matchRoomMembers.roomId, room.id));

      return {
        ...mapRoom(room),
        memberCount: Number(count ?? 0)
      };
    });
  }

  async getCurrentForUser(userId: string) {
    const [room] = await this.db
      .select({
        room: matchRooms
      })
      .from(matchRoomMembers)
      .innerJoin(matchRooms, eq(matchRoomMembers.roomId, matchRooms.id))
      .where(
        and(
          eq(matchRoomMembers.userId, userId),
          or(eq(matchRooms.status, "active"), eq(matchRooms.status, "locked"))
        )
      )
      .orderBy(asc(matchRooms.createdAt))
      .limit(1);

    if (!room?.room) {
      return null;
    }

    return await this.findById(room.room.id);
  }

  async findById(roomId: string) {
    const [room] = await this.db.select().from(matchRooms).where(eq(matchRooms.id, roomId)).limit(1);

    if (!room) {
      return null;
    }

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(matchRoomMembers)
      .where(eq(matchRoomMembers.roomId, roomId));

    return {
      ...mapRoom(room),
      memberCount: Number(count ?? 0)
    };
  }

  async lockRoom(roomId: string) {
    const [room] = await this.db
      .update(matchRooms)
      .set({
        status: "locked",
        lockedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(matchRooms.id, roomId), eq(matchRooms.status, "active")))
      .returning();

    return room ? this.findById(room.id) : null;
  }

  async expireActiveRooms(now: Date) {
    const rows = await this.db
      .update(matchRooms)
      .set({
        status: "expired",
        expiredAt: now,
        updatedAt: now
      })
      .where(and(or(eq(matchRooms.status, "active"), eq(matchRooms.status, "pending_confirmation")), lte(matchRooms.latestCheckoutAt, now)))
      .returning();

    return rows.map((row) => mapRoom(row));
  }

  async listMembers(roomId: string) {
    return await this.db
        .select({
          orderIntentId: matchRoomMembers.orderIntentId,
          userId: matchRoomMembers.userId,
          amount: matchRoomMembers.amount,
          name: users.name,
          image: users.image
      })
      .from(matchRoomMembers)
      .innerJoin(users, eq(matchRoomMembers.userId, users.id))
      .where(eq(matchRoomMembers.roomId, roomId))
      .orderBy(asc(matchRoomMembers.createdAt));
  }

  async getSettlementView(roomId: string): Promise<SettlementView | null> {
    const room = await this.findById(roomId);

    if (!room) {
      return null;
    }

    const members = await this.db
      .select({
        userId: settlements.userId,
        amountOwed: settlements.amountOwed,
        paymentStatus: settlements.status,
        name: users.name,
        image: users.image,
        upiId: users.upiId
      })
      .from(settlements)
      .innerJoin(users, eq(settlements.userId, users.id))
      .where(eq(settlements.roomId, roomId));

    const leader = members.find((member) => member.userId === room.leaderUserId);

    return {
      leader: {
        userId: room.leaderUserId,
        name: leader?.name ?? null,
        upiId: leader?.upiId ?? null
      },
      members: members.map((member) => ({
        userId: member.userId,
        name: member.name,
        image: member.image,
        amountOwed: member.amountOwed,
        paymentStatus: member.paymentStatus as SettlementStatus,
        upiId: member.upiId,
        isLeader: member.userId === room.leaderUserId
      }))
    };
  }
}
