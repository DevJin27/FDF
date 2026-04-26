import { and, eq } from "drizzle-orm";

import { paymentEvents, settlements } from "../db/schema/app";
import { getDb } from "../lib/db";

export class SettlementRepository {
  private readonly db = getDb();

  async markPaid(input: {
    roomId: string;
    memberUserId: string;
    markedByUserId: string;
  }) {
    return await this.db.transaction(async (tx) => {
      const [settlement] = await tx
        .update(settlements)
        .set({
          status: "paid",
          markedPaidAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(settlements.roomId, input.roomId),
            eq(settlements.userId, input.memberUserId)
          )
        )
        .returning();

      if (!settlement) {
        return null;
      }

      await tx.insert(paymentEvents).values({
        roomId: input.roomId,
        memberUserId: input.memberUserId,
        markedByUserId: input.markedByUserId,
        type: "marked_paid",
        metadata: JSON.stringify({
          roomId: input.roomId,
          memberUserId: input.memberUserId
        })
      });

      return settlement;
    });
  }
}
