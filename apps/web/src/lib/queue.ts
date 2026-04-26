import { sql } from "drizzle-orm";

import { getDb } from "./db";
import { DeliveryCluster, QueueSnapshot } from "@/types/api";

export async function getQueueSnapshot(
  deliveryCluster: DeliveryCluster,
  minimumAmount = 200
): Promise<QueueSnapshot> {
  const db = getDb();
  const now = new Date();
  const result = (await db.execute(sql`
    select coalesce(sum(amount), 0) as total, count(*) as count
    from order_intents
    where delivery_cluster = ${deliveryCluster}
      and status = 'open'
      and latest_checkout_at > ${now}
  `)) as { rows?: Array<{ total: number | string | null; count: number | string | null }> };
  const row = result.rows?.[0];
  const totalOpenAmount = Number(row?.total ?? 0);

  return {
    deliveryCluster,
    openIntentCount: Number(row?.count ?? 0),
    totalOpenAmount,
    amountToMinimum: Math.max(minimumAmount - totalOpenAmount, 0),
    minimumAmount
  };
}
