import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  buildWhatsAppMessage,
  calculateCartTotal,
  formatCountdown,
  getInitials,
  GROUP_API_URL,
} from "@/lib/group-client";

import { useGroup } from "@/hooks/useGroup";

const statusStyles: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  locked: "bg-amber-100 text-amber-700",
  ordered: "bg-blue-100 text-blue-700",
};

export default function GroupRoomPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [locking, setLocking] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [upiSaved, setUpiSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const groupId = typeof router.query.id === "string" ? router.query.id : undefined;
  const { group, participants, cart, isHost, timeLeft, sessionWarning, loading } = useGroup(groupId);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setUserId(window.localStorage.getItem("userId"));
    setUserName(window.localStorage.getItem("userName") ?? "");
  }, []);

  useEffect(() => {
    setUpiId(group?.settlement.upiId ?? "");
    setUpiSaved(Boolean(group?.settlement.upiId));
  }, [group?.settlement.upiId]);

  async function handleLockGroup() {
    if (!groupId || !userId) {
      return;
    }

    try {
      setLocking(true);
      const response = await fetch(`${GROUP_API_URL}/api/groups/${groupId}/lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to lock group");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLocking(false);
    }
  }

  if (!userId && !loading) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-[480px]">
          <section className="rounded-[28px] border border-black/5 bg-white/90 p-6 shadow-card">
            <h1 className="text-2xl font-semibold text-[#151515]">This room needs your saved profile.</h1>
            <p className="mt-3 text-sm leading-6 text-[#625e53]">
              Head back home, set your name, and rejoin the group from the landing page.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-5 w-full rounded-2xl bg-[#FFD000] px-4 py-3 text-sm font-semibold text-black"
            >
              Back to home
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (loading || !group) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-[480px] rounded-[28px] border border-black/5 bg-white/90 p-6 shadow-card">
          <p className="text-sm font-medium text-[#625e53]">Loading your group room...</p>
        </div>
      </main>
    );
  }

  const cartTotal = calculateCartTotal(cart);
  const effectiveGroup = {
    ...group,
    settlement: {
      ...group.settlement,
      upiId: upiId || group.settlement.upiId,
      hostName: userName || group.settlement.hostName,
    },
  };
  const exportMessage = buildWhatsAppMessage(effectiveGroup, cart);

  async function handleSaveUpi() {
    if (!groupId || !userId || !upiId.trim()) {
      setSaveMessage("Enter a UPI ID before saving.");
      return;
    }

    try {
      setSavingUpi(true);
      setSaveMessage("");

      const response = await fetch(`${GROUP_API_URL}/api/groups/${groupId}/upi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          upiId: upiId.trim(),
          hostName: userName || effectiveGroup.settlement.hostName || "Host",
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to save UPI ID");
      }

      setUpiSaved(true);
      setSaveMessage("UPI ID saved. You can export the payment message now.");
    } catch (error) {
      console.error(error);
      setSaveMessage("We couldn't save that UPI ID. Please try again.");
    } finally {
      setSavingUpi(false);
    }
  }

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(exportMessage);
      setSaveMessage("Export copied to your clipboard.");
    } catch (error) {
      console.error(error);
      setSaveMessage("Clipboard access failed. Try WhatsApp export instead.");
    }
  }

  function handleWhatsAppExport() {
    window.open(`https://wa.me/?text=${encodeURIComponent(exportMessage)}`, "_blank");
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-[480px] space-y-4">
        <section className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#938f7d]">
                Group room
              </p>
              <h1 className="mt-2 truncate text-2xl font-semibold text-[#151515]">{group.name}</h1>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                statusStyles[group.status] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {group.status}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4 rounded-[24px] bg-[#151515] px-4 py-4 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Time left</p>
              <p className="mt-2 text-3xl font-semibold">{formatCountdown(timeLeft)}</p>
            </div>

            {isHost && group.status === "open" ? (
              <button
                type="button"
                onClick={handleLockGroup}
                disabled={locking}
                className="rounded-2xl bg-[#FFD000] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {locking ? "Locking..." : "Lock group"}
              </button>
            ) : null}
          </div>

          {sessionWarning || timeLeft < 300_000 ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Session ends soon — lock the cart before it expires!
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#938f7d]">
                Who&apos;s in ({participants.length})
              </p>
              <p className="mt-2 text-sm text-[#625e53]">{group.address}</p>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/group/${group.id}/cart`)}
              className="rounded-2xl border border-black/10 bg-[#fff8dc] px-4 py-3 text-sm font-semibold text-[#151515]"
            >
              View cart →
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 rounded-2xl border border-black/5 bg-[#fffdf7] px-4 py-3"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#151515] text-sm font-semibold text-[#FFD000]">
                  {getInitials(participant.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#151515]">{participant.name}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
                    {participant.id === group.hostId ? (
                      <span className="rounded-full bg-[#151515] px-2 py-1 text-[#FFD000]">Host</span>
                    ) : null}
                    {!participant.online ? (
                      <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700">Offline</span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">Online</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#938f7d]">
            Cart snapshot
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#fff7d6] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#8b7340]">Items</p>
              <p className="mt-2 text-2xl font-semibold text-[#151515]">{cart.length}</p>
            </div>
            <div className="rounded-2xl bg-[#f5f5f4] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#6d675a]">Cart total</p>
              <p className="mt-2 text-2xl font-semibold text-[#151515]">₹{Math.round(cartTotal)}</p>
            </div>
          </div>

          {group.status !== "open" ? (
            <button
              type="button"
              onClick={() => router.push(`/group/${group.id}/settle`)}
              className="mt-4 w-full rounded-2xl bg-[#FFD000] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-95"
            >
              View settlement →
            </button>
          ) : null}
        </section>

        {isHost && group.status === "locked" ? (
          <section className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#938f7d]">
              Host handoff
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#151515]">Collect payment details</h2>
            <p className="mt-2 text-sm leading-6 text-[#625e53]">
              Save your UPI ID so the room can export the final order and payment breakdown.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#35322a]">UPI ID</span>
                <input
                  value={upiId}
                  onChange={(event) => {
                    setUpiId(event.target.value);
                    setUpiSaved(false);
                  }}
                  placeholder="priya@upi"
                  className="w-full rounded-2xl border border-black/10 bg-[#fffdf7] px-4 py-3 outline-none transition focus:border-black/30"
                />
              </label>

              <button
                type="button"
                onClick={handleSaveUpi}
                disabled={savingUpi}
                className="w-full rounded-2xl bg-[#FFD000] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingUpi ? "Saving UPI ID..." : "Save UPI ID"}
              </button>

              {upiSaved ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleWhatsAppExport}
                    className="rounded-2xl bg-[#151515] px-4 py-3 text-sm font-semibold text-white"
                  >
                    WhatsApp export
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="rounded-2xl border border-black/10 bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#151515]"
                  >
                    Copy to clipboard
                  </button>
                </div>
              ) : null}

              {saveMessage ? <p className="text-sm text-[#625e53]">{saveMessage}</p> : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
