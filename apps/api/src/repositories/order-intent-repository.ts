import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import { orderIntents } from "../db/schema/app";
import { getDb } from "../lib/db";
import { DeliveryCluster, OrderIntentStatus, OrderIntentSummary, QueueSnapshot } from "../lib/domain";

function mapIntent(row: typeof orderIntents.$inferSelect): OrderIntentSummary {
  return {
    id: row.id,
    userId: row.userId,
    amount: Number(row.amount),
    latestCheckoutAt: row.latestCheckoutAt.toISOString(),
    deliveryCluster: row.deliveryCluster as DeliveryCluster,
    status: row.status as OrderIntentStatus,
    createdAt: row.createdAt.toISOString(),
    roomId: row.roomId ?? null
  };
}

export class OrderIntentRepository {
  private readonly db = getDb();

  async create(input: {
    userId: string;
    amount: number;
    latestCheckoutAt: Date;
    deliveryCluster: DeliveryCluster;
  }) {
    const [intent] = await this.db
      .insert(orderIntents)
      .values({
        userId: input.userId,
        amount: input.amount,
        latestCheckoutAt: input.latestCheckoutAt,
        deliveryCluster: input.deliveryCluster,
        status: "open"
      })
      .returning();

    return mapIntent(intent);
  }

  async listForUser(userId: string) {
    const rows = await this.db
      .select()
      .from(orderIntents)
      .where(eq(orderIntents.userId, userId))
      .orderBy(asc(orderIntents.createdAt));

    return rows.map(mapIntent);
  }

  async findById(intentId: string) {
    const [intent] = await this.db.select().from(orderIntents).where(eq(orderIntents.id, intentId)).limit(1);
    return intent ? mapIntent(intent) : null;
  }

  async listOpenByCluster(cluster: DeliveryCluster, now: Date) {
    const rows = await this.db
      .select()
      .from(orderIntents)
      .where(
        and(
          eq(orderIntents.deliveryCluster, cluster),
          eq(orderIntents.status, "open"),
          sql`${orderIntents.latestCheckoutAt} > ${now}`
        )
      )
      .orderBy(asc(orderIntents.createdAt));

    return rows.map(mapIntent);
  }

  async cancel(intentId: string, userId: string) {
    const [intent] = await this.db
      .update(orderIntents)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(orderIntents.id, intentId),
          eq(orderIntents.userId, userId),
          eq(orderIntents.status, "open")
        )
      )
      .returning();

    return intent ? mapIntent(intent) : null;
  }

  async markMatched(intentIds: string[], roomId: string, status: "reserved" | "matched") {
    if (intentIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .update(orderIntents)
      .set({
        roomId,
        status,
        updatedAt: new Date()
      })
      .where(inArray(orderIntents.id, intentIds))
      .returning();

    return rows.map(mapIntent);
  }

  async markExpiredOpenIntents(now: Date) {
    const rows = await this.db
      .update(orderIntents)
      .set({
        status: "expired",
        expiredAt: now,
        updatedAt: now
      })
      .where(and(eq(orderIntents.status, "open"), sql`${orderIntents.latestCheckoutAt} <= ${now}`))
      .returning();

    return rows.map(mapIntent);
  }

  async markExpiredByRoom(roomId: string, now: Date) {
    const rows = await this.db
      .update(orderIntents)
      .set({
        status: "expired",
        expiredAt: now,
        updatedAt: now
      })
      .where(and(eq(orderIntents.roomId, roomId), eq(orderIntents.status, "reserved")))
      .returning();

    return rows.map(mapIntent);
  }

  async getQueueSnapshot(cluster: DeliveryCluster, minimumAmount: number, now: Date): Promise<QueueSnapshot> {
    const [result] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${orderIntents.amount}), 0)`,
        count: sql<number>`count(*)`
      })
      .from(orderIntents)
      .where(
        and(
          eq(orderIntents.deliveryCluster, cluster),
          eq(orderIntents.status, "open"),
          sql`${orderIntents.latestCheckoutAt} > ${now}`
        )
      );

    const totalOpenAmount = Number(result?.total ?? 0);
    return {
      deliveryCluster: cluster,
      openIntentCount: Number(result?.count ?? 0),
          totalOpenAmount,
      amountToMinimum: Math.max(minimumAmount - totalOpenAmount, 0),
      minimumAmount
    };
  }
}
