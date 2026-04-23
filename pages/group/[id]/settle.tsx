import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { formatCurrency, getInitials, GROUP_API_URL, normalizeGroup } from "@/lib/group-client";
import type { Group, GroupResponse, SplitResponse, SplitSummaryResponse } from "@/types/group";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.error || payload.message || fallback;
  } catch {
    return fallback;
  }
}

export default function GroupSettlementPage() {
  const router = useRouter();
  const groupId = typeof router.query.id === "string" ? router.query.id : undefined;

  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [split, setSplit] = useState<SplitResponse | null>(null);
  const [summary, setSummary] = useState<SplitSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [markingUserId, setMarkingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setUserId(window.localStorage.getItem("userId"));
  }, []);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    const controller = new AbortController();

    async function loadSettlementPage() {
      try {
        setLoading(true);
        setPageError("");

        const [splitResponse, groupResponse] = await Promise.all([
          fetch(`${GROUP_API_URL}/api/split/${groupId}`, {
            signal: controller.signal,
          }),
          fetch(`${GROUP_API_URL}/api/groups/${groupId}`, {
            signal: controller.signal,
          }),
        ]);

        if (!splitResponse.ok) {
          throw new Error(await readErrorMessage(splitResponse, "Unable to load split details"));
        }

        if (!groupResponse.ok) {
          throw new Error(await readErrorMessage(groupResponse, "Unable to load group"));
        }

        const splitPayload = (await splitResponse.json()) as SplitResponse;
        const groupPayload = (await groupResponse.json()) as GroupResponse;

        if (controller.signal.aborted) {
          return;
        }

        setSplit(splitPayload);
        setGroup(normalizeGroup(groupPayload.group));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setPageError(getErrorMessage(error, "We couldn't load settlement right now."));
        setSplit(null);
        setGroup(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadSettlementPage();

    return () => controller.abort();
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !group || !userId || userId !== group.hostId) {
      setSummary(null);
      setSummaryError("");
      setSummaryLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadSummary() {
      try {
        setSummaryLoading(true);
        setSummaryError("");

        const response = await fetch(`${GROUP_API_URL}/api/split/${groupId}/summary`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Unable to load host tracker"));
        }

        const payload = (await response.json()) as SplitSummaryResponse;

        if (!controller.signal.aborted) {
          setSummary(payload);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setSummaryError(getErrorMessage(error, "We couldn't load the collection tracker."));
        setSummary(null);
      } finally {
        if (!controller.signal.aborted) {
          setSummaryLoading(false);
        }
      }
    }

    void loadSummary();

    return () => controller.abort();
  }, [group?.hostId, groupId, userId]);

  const isHost = Boolean(userId && group?.hostId === userId);

  const orderedParticipants = useMemo(() => {
    if (!split) {
      return [];
    }

    return [...split.participants].sort((left, right) => Number(left.isHost) - Number(right.isHost));
  }, [split]);

  const fallbackHostCollectionTarget = split
    ? split.participants
        .filter((participant) => !participant.isHost)
        .reduce((sum, participant) => sum + Number(participant.owesAmount ?? 0), 0)
    : 0;

  const hostCollectionTarget = Number(summary?.hostCollects ?? fallbackHostCollectionTarget);

  const collectedAmount = split
    ? split.participants
        .filter((participant) => !participant.isHost)
        .reduce((sum, participant) => {
          const hasPaid = group?.settlement.payments?.[participant.userId] === "paid";
          return hasPaid ? sum + Number(participant.owesAmount ?? 0) : sum;
        }, 0)
    : 0;

  const progressPercent =
    hostCollectionTarget > 0 ? Math.min(100, (collectedAmount / hostCollectionTarget) * 100) : 0;

  const paymentLines = split
    ? split.participants
        .filter((participant) => !participant.isHost)
        .map(
          (participant) =>
            `  ${participant.userName}: ${formatCurrency(participant.owesAmount ?? 0)} → ${
              group?.settlement.upiId || "ask host"
            }`,
        )
    : [];

  const exportMessage =
    split && group
      ? [
          `🛒 Group Order — ${group.name}`,
          `📍 Deliver to: ${group.address}`,
          "",
          ...group.cart.map(
            (item) => `• ${item.displayName} x${item.totalQty} — ${formatCurrency(item.totalPrice)}`,
          ),
          "",
          `🛵 Delivery: ${formatCurrency(group.deliveryFee)}`,
          `💰 Total: ${formatCurrency(split.grandTotal)}`,
          "",
          ...(paymentLines.length > 0 ? ["💸 Pay your share:", ...paymentLines] : []),
        ].join("\n")
      : "";

  async function refreshGroupSnapshot() {
    if (!groupId) {
      return;
    }

    const response = await fetch(`${GROUP_API_URL}/api/groups/${groupId}`);

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Unable to refresh group"));
    }

    const payload = (await response.json()) as GroupResponse;
    setGroup(normalizeGroup(payload.group));
  }

  async function handleMarkPaid(participantUserId: string, participantName: string) {
    if (!groupId) {
      return;
    }

    try {
      setMarkingUserId(participantUserId);
      setActionMessage("");

      const response = await fetch(`${GROUP_API_URL}/api/groups/${groupId}/paid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: participantUserId,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to mark payment"));
      }

      await response.json();
      await refreshGroupSnapshot();
      setActionMessage(`${participantName} marked as paid.`);
    } catch (error) {
      console.error(error);
      setActionMessage(getErrorMessage(error, "We couldn't update that payment right now."));
    } finally {
      setMarkingUserId(null);
    }
  }

  async function handleCopySummary() {
    if (!exportMessage) {
      return;
    }

    try {
      await navigator.clipboard.writeText(exportMessage);
      setActionMessage("Settlement summary copied to clipboard.");
    } catch (error) {
      console.error(error);
      setActionMessage("Clipboard access failed. Try WhatsApp export instead.");
    }
  }

  function handleWhatsAppExport() {
    if (!exportMessage) {
      return;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(exportMessage)}`, "_blank");
  }

  if (!userId && !loading) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-[480px] rounded-[28px] border border-black/5 bg-white/90 p-6 shadow-card">
          <h1 className="text-2xl font-semibold text-[#151515]">Open settlement from your saved device.</h1>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-5 w-full rounded-2xl bg-[#FFD000] px-4 py-3 text-sm font-semibold text-black"
          >
            Back to home
          </button>
        </div>
      </main>
    );
  }

  if (loading || !groupId) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto flex max-w-[480px] items-center justify-center rounded-[28px] border border-black/5 bg-white/90 p-6 shadow-card">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FFD000] border-t-transparent" />
          <p className="ml-3 text-sm font-medium text-[#625e53]">Loading settlement...</p>
        </div>
      </main>
    );
  }

  if (!split || !group) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-[480px] rounded-[28px] border border-red-100 bg-white/90 p-6 shadow-card">
          <h1 className="text-xl font-semibold text-[#151515]">Settlement unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-[#625e53]">
            {pageError || "We couldn't load settlement right now."}
          </p>
          <button
            type="button"
            onClick={() => router.push(`/group/${groupId}/cart`)}
            className="mt-5 w-full rounded-2xl bg-[#151515] px-4 py-3 text-sm font-semibold text-white"
          >
            Back to cart
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-[480px] space-y-4">
        <section className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#938f7d]">
                Settlement
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-[#151515]">{group.name}</h1>
              <p className="mt-3 text-sm leading-6 text-[#625e53]">
                {split.hostName} will pay Blinkit {formatCurrency(split.grandTotal)}. Everyone pays{" "}
                {split.hostName}.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/group/${groupId}/cart`)}
              className="rounded-2xl border border-black/10 bg-[#fff8dc] px-4 py-3 text-sm font-semibold text-[#151515]"
            >
              Back
            </button>
          </div>
        </section>

        <section className="space-y-3">
          {orderedParticipants.map((participant) => {
            const isCurrentUser = participant.userId === userId;
            const isPaid = group.settlement.payments?.[participant.userId] === "paid";

            return (
              <article
                key={participant.userId}
                className={`rounded-[28px] border bg-white/90 p-5 shadow-card ${
                  isCurrentUser ? "border-[#FFD000]" : "border-black/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#151515] text-sm font-semibold text-[#FFD000]">
                      {getInitials(participant.userName)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold text-[#151515]">
                          {participant.userName}
                        </h2>
                        {participant.isHost ? (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                            Host 👑
                          </span>
                        ) : null}
                        {isPaid ? (
                          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                            Paid ✓
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between text-[#625e53]">
                    <span>Items:</span>
                    <span className="font-semibold text-[#151515]">
                      {formatCurrency(participant.itemsTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#625e53]">
                    <span>Delivery:</span>
                    <span className="font-semibold text-[#151515]">
                      {formatCurrency(participant.deliveryShare)}
                    </span>
                  </div>
                  <div className="border-t border-black/10 pt-3">
                    {participant.isHost ? (
                      <div className="flex items-center justify-between text-[#625e53]">
                        <span>Pays to Blinkit:</span>
                        <span className="text-base font-semibold text-[#151515]">
                          {formatCurrency(split.grandTotal)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[#625e53]">
                        <span>You owe:</span>
                        <span className="text-base font-semibold text-[#151515]">
                          {formatCurrency(participant.grandTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {!participant.isHost ? (
                  <div className="mt-5">
                    {participant.upiLink ? (
                      <button
                        type="button"
                        onClick={() => window.open(participant.upiLink ?? "", "_blank")}
                        className="w-full rounded-2xl bg-[#FFD000] px-4 py-3 text-sm font-medium text-black transition hover:brightness-95"
                      >
                        Pay {formatCurrency(participant.owesAmount ?? 0)} to {split.hostName} →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setActionMessage(`Ask ${split.hostName} for a UPI ID before paying.`)
                        }
                        className="w-full rounded-2xl border border-black/10 bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#151515]"
                      >
                        Ask host for UPI ID
                      </button>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        {isHost ? (
          <section className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#938f7d]">
                  Host tracker
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#151515]">Collection progress</h2>
              </div>
              {summaryLoading ? (
                <span className="text-xs font-medium text-[#8a8576]">Refreshing...</span>
              ) : null}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-[#625e53]">
                <span>Collected {formatCurrency(collectedAmount)}</span>
                <span>of {formatCurrency(hostCollectionTarget)}</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#f3efe2]">
                <div
                  className="h-full rounded-full bg-[#FFD000] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {split.participants
                .filter((participant) => !participant.isHost)
                .map((participant) => {
                  const isPaid = group.settlement.payments?.[participant.userId] === "paid";

                  return (
                    <div
                      key={participant.userId}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-[#fffdf7] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#151515]">
                          {participant.userName}
                        </p>
                        <p className="mt-1 text-xs text-[#8a8576]">
                          {formatCurrency(participant.owesAmount ?? 0)}
                        </p>
                      </div>

                      {isPaid ? (
                        <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800">
                          Paid ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            void handleMarkPaid(participant.userId, participant.userName)
                          }
                          disabled={markingUserId === participant.userId}
                          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#151515] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {markingUserId === participant.userId ? "Marking..." : "Mark paid"}
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            {summaryError ? <p className="mt-4 text-sm text-red-600">{summaryError}</p> : null}
          </section>
        ) : null}

        <section className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#938f7d]">Export</p>
          <h2 className="mt-2 text-xl font-semibold text-[#151515]">Share the final summary</h2>
          <p className="mt-2 text-sm leading-6 text-[#625e53]">
            Send the full order and payment breakdown to the group.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleWhatsAppExport}
              className="rounded-2xl bg-[#151515] px-4 py-3 text-sm font-semibold text-white"
            >
              Export to WhatsApp
            </button>
            <button
              type="button"
              onClick={() => void handleCopySummary()}
              className="rounded-2xl border border-black/10 bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#151515]"
            >
              Copy summary
            </button>
          </div>

          {actionMessage ? <p className="mt-4 text-sm text-[#625e53]">{actionMessage}</p> : null}
        </section>
      </div>
    </main>
  );
}
