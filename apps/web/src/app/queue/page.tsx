import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getQueueSnapshot } from "@/lib/queue";
import { OrderIntent } from "@/types/api";

export default async function QueuePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const intentsPayload = await apiFetch<{ intents: OrderIntent[] }>("/api/intents/me").catch(
    () => ({ intents: [] })
  );
  const openIntent = intentsPayload.intents.find((intent) => intent.status === "open");

  if (!openIntent) {
    redirect("/dashboard");
  }

  const snapshot = await getQueueSnapshot(openIntent.deliveryCluster);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine/60">Queue View</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">
          {openIntent.deliveryCluster.replace("-", " ")} live queue
        </h1>
        <p className="mt-3 text-sm leading-7 text-ink/70">
          This is the running total the matcher uses to decide when your intent can join a valid
          match room.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[28px] bg-ink p-5 text-white shadow-panel">
          <p className="text-xs text-white/60">Your amount</p>
          <p className="mt-2 text-3xl font-semibold">₹{openIntent.amount}</p>
        </div>
        <div className="rounded-[28px] bg-white p-5 shadow-panel">
          <p className="text-xs text-ink/60">Open intents</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{snapshot.openIntentCount}</p>
        </div>
        <div className="rounded-[28px] bg-white p-5 shadow-panel">
          <p className="text-xs text-ink/60">Total queued</p>
          <p className="mt-2 text-3xl font-semibold text-ink">₹{snapshot.totalOpenAmount}</p>
        </div>
        <div className="rounded-[28px] bg-white p-5 shadow-panel">
          <p className="text-xs text-ink/60">Still needed</p>
          <p className="mt-2 text-3xl font-semibold text-ink">₹{snapshot.amountToMinimum}</p>
        </div>
      </section>
    </div>
  );
}
