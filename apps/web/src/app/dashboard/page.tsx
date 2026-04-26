import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard-client";
import { users } from "@/db/schema/auth";
import { apiFetch } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getQueueSnapshot } from "@/lib/queue";
import { MatchRoom, OrderIntent } from "@/types/api";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const intentsPayload = await apiFetch<{ intents: OrderIntent[] }>("/api/intents/me").catch(
    () => ({ intents: [] })
  );
  const currentRoomPayload = await apiFetch<{ room: MatchRoom | null }>("/api/matches/current").catch(
    () => ({ room: null })
  );

  const openIntent = intentsPayload.intents.find((intent) => intent.status === "open") ?? null;
  const queueSnapshot = openIntent ? await getQueueSnapshot(openIntent.deliveryCluster) : null;
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-black/5 bg-white px-6 py-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine/60">
          Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">
          Build a real order queue, not a pretend cart room
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/70">
          Your intent enters a live, authenticated queue. The backend keeps matching within the
          same cluster, enforces the deadline window, and picks the closest valid sum above ₹200.
        </p>
      </section>

      <DashboardClient
        initialIntents={intentsPayload.intents}
        initialQueue={queueSnapshot}
        initialRoom={currentRoomPayload.room}
        initialUpiId={user?.upiId ?? null}
        userId={session.user.id}
      />
    </div>
  );
}
