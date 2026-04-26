"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

import { getPublicApiBaseUrl } from "@/lib/public-config";
import { DeliveryCluster, MatchRoom, OrderIntent, QueueSnapshot } from "@/types/api";

const clusters: Array<{ value: DeliveryCluster; label: string }> = [
  { value: "hostel-a", label: "Hostel A" },
  { value: "hostel-b", label: "Hostel B" },
  { value: "main-gate", label: "Main Gate" },
  { value: "library", label: "Library" }
];

async function getToken() {
  const response = await fetch("/api/internal/token", { cache: "no-store" });
  const data = (await response.json()) as { token?: string };

  if (!response.ok || !data.token) {
    throw new Error("Unable to authenticate realtime session");
  }

  return data.token;
}

export function DashboardClient({
  initialIntents,
  initialQueue,
  initialRoom,
  initialUpiId,
  userId
}: {
  initialIntents: OrderIntent[];
  initialQueue: QueueSnapshot | null;
  initialRoom: MatchRoom | null;
  initialUpiId: string | null;
  userId: string;
}) {
  const router = useRouter();
  const [intents, setIntents] = useState(initialIntents);
  const [queueSnapshot, setQueueSnapshot] = useState(initialQueue);
  const [activeRoom, setActiveRoom] = useState(initialRoom);
  const [amount, setAmount] = useState("160");
  const [latestCheckoutAt, setLatestCheckoutAt] = useState("");
  const [deliveryCluster, setDeliveryCluster] = useState<DeliveryCluster>(
    (initialIntents.find((intent) => intent.status === "open")?.deliveryCluster ?? "hostel-a") as DeliveryCluster
  );
  const [upiId, setUpiId] = useState(initialUpiId ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const openIntent = useMemo(
    () => intents.find((intent) => intent.status === "open"),
    [intents]
  );

  async function refreshState() {
    router.refresh();
  }

  async function createIntent() {
    if (!latestCheckoutAt) {
      setMessage("Pick a checkout deadline first.");
      return;
    }

    try {
      setBusy(true);
      const token = await getToken();
      const response = await fetch(`${getPublicApiBaseUrl()}/api/intents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(amount),
          latestCheckoutAt: new Date(latestCheckoutAt).toISOString(),
          deliveryCluster
        })
      });

      const data = (await response.json()) as OrderIntent | { error?: string };
      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Unable to create intent");
      }

      setMessage("Intent added to the live queue.");
      await refreshState();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create intent");
    } finally {
      setBusy(false);
    }
  }

  async function cancelIntent(intentId: string) {
    try {
      setBusy(true);
      const token = await getToken();
      const response = await fetch(`${getPublicApiBaseUrl()}/api/intents/${intentId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = (await response.json()) as OrderIntent | { error?: string };
      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Unable to cancel intent");
      }

      setMessage("Intent cancelled.");
      await refreshState();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to cancel intent");
    } finally {
      setBusy(false);
    }
  }

  async function saveUpi() {
    try {
      setBusy(true);
      const token = await getToken();
      const response = await fetch(`${getPublicApiBaseUrl()}/api/profile/upi`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ upiId: upiId.trim() || null })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save UPI ID");
      }

      setMessage("UPI ID saved.");
      await refreshState();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save UPI ID");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let socketRef: ReturnType<typeof io> | null = null;

    void getToken().then((token) => {
      socketRef = io(getPublicApiBaseUrl(), {
        autoConnect: true,
        auth: { token }
      });

      if (openIntent?.deliveryCluster) {
        socketRef.emit("subscribe.cluster", openIntent.deliveryCluster);
      }

      socketRef.on("queue.updated", (payload: { snapshot: QueueSnapshot }) => {
        setQueueSnapshot(payload.snapshot);
      });

      socketRef.on("match.formed", (payload: { roomId: string; userIds: string[] }) => {
        if (payload.userIds.includes(userId)) {
          router.push(`/match/${payload.roomId}`);
        }
      });
    });

    return () => {
      socketRef?.disconnect();
    };
  }, [openIntent?.deliveryCluster, router, userId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine/60">
              Create Intent
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Queue your Blinkit amount, not a fake shared cart
            </h2>
          </div>
          {openIntent ? (
            <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine">
              {openIntent.status}
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-ink">Amount</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-mist px-4 py-3 outline-none"
              inputMode="numeric"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-ink">Need it before</span>
            <input
              type="datetime-local"
              value={latestCheckoutAt}
              onChange={(event) => setLatestCheckoutAt(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-mist px-4 py-3 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-ink">Delivery cluster</span>
            <select
              value={deliveryCluster}
              onChange={(event) => setDeliveryCluster(event.target.value as DeliveryCluster)}
              className="w-full rounded-2xl border border-black/10 bg-mist px-4 py-3 outline-none"
            >
              {clusters.map((cluster) => (
                <option key={cluster.value} value={cluster.value}>
                  {cluster.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={createIntent}
            disabled={busy}
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
          >
            Add to queue
          </button>
          {openIntent ? (
            <button
              type="button"
              onClick={() => cancelIntent(openIntent.id)}
              disabled={busy}
              className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-ink"
            >
              Cancel open intent
            </button>
          ) : null}
        </div>

        <div className="mt-8 rounded-[28px] bg-ink px-5 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">
            Queue pulse
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/5 px-4 py-4">
              <p className="text-xs text-white/60">Open intents</p>
              <p className="mt-2 text-2xl font-semibold">{queueSnapshot?.openIntentCount ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-4">
              <p className="text-xs text-white/60">Queued total</p>
              <p className="mt-2 text-2xl font-semibold">₹{queueSnapshot?.totalOpenAmount ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-4">
              <p className="text-xs text-white/60">Gap to minimum</p>
              <p className="mt-2 text-2xl font-semibold">₹{queueSnapshot?.amountToMinimum ?? 200}</p>
            </div>
          </div>
        </div>

        {message ? <p className="mt-4 text-sm text-pine">{message}</p> : null}
      </section>

      <section className="space-y-6">
        <div className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine/60">
            Live Status
          </p>
          <h3 className="mt-2 text-xl font-semibold text-ink">Your queue state</h3>
          {openIntent ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-mist px-4 py-4">
                <p className="text-sm text-ink/70">Open amount</p>
                <p className="mt-1 text-2xl font-semibold text-ink">₹{openIntent.amount}</p>
              </div>
              <div className="rounded-2xl bg-mist px-4 py-4">
                <p className="text-sm text-ink/70">Deadline</p>
                <p className="mt-1 font-medium text-ink">
                  {new Date(openIntent.latestCheckoutAt).toLocaleString("en-IN")}
                </p>
              </div>
              <a
                href="/queue"
                className="inline-flex rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white"
              >
                Open queue view
              </a>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-ink/65">
              No active open intent right now. Add one to start listening for compatible orders.
            </p>
          )}
        </div>

        <div className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine/60">
            Payment Setup
          </p>
          <h3 className="mt-2 text-xl font-semibold text-ink">UPI for leader payouts</h3>
          <div className="mt-4 space-y-3">
            <input
              value={upiId}
              onChange={(event) => setUpiId(event.target.value)}
              placeholder="name@upi"
              className="w-full rounded-2xl border border-black/10 bg-mist px-4 py-3 outline-none"
            />
            <button
              type="button"
              onClick={saveUpi}
              disabled={busy}
              className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white"
            >
              Save UPI
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine/60">
            Match Room
          </p>
          <h3 className="mt-2 text-xl font-semibold text-ink">Current match</h3>
          {activeRoom ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-ink/70">
                {activeRoom.memberCount} people, ₹{activeRoom.totalAmount} total, status {activeRoom.status}
              </p>
              <a
                href={`/match/${activeRoom.id}`}
                className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
              >
                Open match room
              </a>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-ink/65">
              No active room yet. When the matcher finds the closest valid combination above ₹200,
              you’ll be moved there live.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
