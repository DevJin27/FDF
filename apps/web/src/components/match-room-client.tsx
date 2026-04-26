"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

import { getPublicApiBaseUrl } from "@/lib/public-config";
import { MatchRoom, SettlementView } from "@/types/api";

async function getToken() {
  const response = await fetch("/api/internal/token", { cache: "no-store" });
  const data = (await response.json()) as { token?: string };

  if (!response.ok || !data.token) {
    throw new Error("Unable to authenticate realtime session");
  }

  return data.token;
}

export function MatchRoomClient({
  room,
  settlement,
  userId
}: {
  room: MatchRoom;
  settlement: SettlementView | null;
  userId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const isLeader = room.leaderUserId === userId;

  async function lockRoom() {
    try {
      const token = await getToken();
      const response = await fetch(`${getPublicApiBaseUrl()}/api/matches/${room.id}/lock`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to lock room");
      }

      setMessage("Room locked.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to lock room");
    }
  }

  async function markPaid(memberUserId: string) {
    try {
      const token = await getToken();
      const response = await fetch(
        `${getPublicApiBaseUrl()}/api/matches/${room.id}/payments/${memberUserId}/mark-paid`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update payment");
      }

      setMessage("Payment updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update payment");
    }
  }

  useEffect(() => {
    let socketRef: ReturnType<typeof io> | null = null;

    void getToken().then((token) => {
      socketRef = io(getPublicApiBaseUrl(), {
        autoConnect: true,
        auth: { token }
      });
      socketRef.emit("subscribe.match", room.id);

      const refresh = () => router.refresh();
      socketRef.on("match.updated", refresh);
      socketRef.on("match.locked", refresh);
      socketRef.on("payment.updated", refresh);
    });

    return () => {
      socketRef?.disconnect();
    };
  }, [room.id, router]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine/60">
          Match Room
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">
          {room.memberCount} orders aligned before {new Date(room.latestCheckoutAt).toLocaleTimeString("en-IN")}
        </h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-mist px-4 py-4">
            <p className="text-xs text-ink/60">Total</p>
            <p className="mt-2 text-2xl font-semibold text-ink">₹{room.totalAmount}</p>
          </div>
          <div className="rounded-2xl bg-mist px-4 py-4">
            <p className="text-xs text-ink/60">Minimum</p>
            <p className="mt-2 text-2xl font-semibold text-ink">₹{room.minimumAmount}</p>
          </div>
          <div className="rounded-2xl bg-mist px-4 py-4">
            <p className="text-xs text-ink/60">Cluster</p>
            <p className="mt-2 text-lg font-semibold capitalize text-ink">
              {room.deliveryCluster.replace("-", " ")}
            </p>
          </div>
          <div className="rounded-2xl bg-mist px-4 py-4">
            <p className="text-xs text-ink/60">Status</p>
            <p className="mt-2 text-lg font-semibold capitalize text-ink">{room.status}</p>
          </div>
        </div>

        {isLeader ? (
          <button
            type="button"
            onClick={lockRoom}
            className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
          >
            Lock room and place Blinkit order
          </button>
        ) : null}
        {message ? <p className="mt-4 text-sm text-pine">{message}</p> : null}
      </section>

      {settlement ? (
        <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine/60">
            Settlement
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Pay {settlement.leader.name ?? "Leader"} after the room locks
          </h2>

          <div className="mt-6 space-y-3">
            {settlement.members.map((member) => (
              <article
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-mist px-4 py-4"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {member.name ?? "Anonymous"} {member.isLeader ? "(Leader)" : ""}
                  </p>
                  <p className="mt-1 text-sm text-ink/60">
                    Owes ₹{member.amountOwed} • {member.paymentStatus}
                  </p>
                  {member.upiId ? (
                    <p className="mt-1 text-sm text-ink/60">UPI: {member.upiId}</p>
                  ) : null}
                </div>

                {isLeader && !member.isLeader && member.paymentStatus !== "paid" ? (
                  <button
                    type="button"
                    onClick={() => markPaid(member.userId)}
                    className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink"
                  >
                    Mark paid
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
