import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { useSocket } from "@/hooks/useSocket";
import {
  formatCurrency,
  GROUP_API_URL,
  normalizeCartItem,
  normalizeGroup,
} from "@/lib/group-client";
import type {
  CartAddResponse,
  CartItem,
  CartResponse,
  CartTotals,
  CartUpdatedPayload,
  DuplicateCheckResponse,
  Group,
  GroupResponse,
} from "@/types/group";

const HEARTBEAT_MS = 15_000;
const EMPTY_TOTALS: CartTotals = {
  itemCount: 0,
  totalUnits: 0,
  cartTotal: 0,
};

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

export default function GroupCartPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const groupId = typeof router.query.id === "string" ? router.query.id : undefined;

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [group, setGroup] = useState<Group | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState<CartTotals>(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [pendingDuplicate, setPendingDuplicate] = useState<CartItem | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setUserId(window.localStorage.getItem("userId"));
    setUserName(window.localStorage.getItem("userName") ?? "");
  }, []);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    const controller = new AbortController();

    async function loadCartPage() {
      try {
        setLoading(true);
        setPageError("");

        const [cartResponse, groupResponse] = await Promise.all([
          fetch(`${GROUP_API_URL}/api/cart/${groupId}`, {
            signal: controller.signal,
          }),
          fetch(`${GROUP_API_URL}/api/groups/${groupId}`, {
            signal: controller.signal,
          }),
        ]);

        if (!cartResponse.ok) {
          throw new Error(await readErrorMessage(cartResponse, "Unable to load cart"));
        }

        if (!groupResponse.ok) {
          throw new Error(await readErrorMessage(groupResponse, "Unable to load group"));
        }

        const cartPayload = (await cartResponse.json()) as CartResponse;
        const groupPayload = (await groupResponse.json()) as GroupResponse;

        if (controller.signal.aborted) {
          return;
        }

        setCart((cartPayload.cart ?? []).map((item) => normalizeCartItem(item)));
        setTotals({
          itemCount: Number(cartPayload.totals?.itemCount ?? 0),
          totalUnits: Number(cartPayload.totals?.totalUnits ?? 0),
          cartTotal: Number(cartPayload.totals?.cartTotal ?? 0),
        });
        setGroup(normalizeGroup(groupPayload.group));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setPageError(getErrorMessage(error, "We couldn't load this cart right now."));
        setCart([]);
        setTotals(EMPTY_TOTALS);
        setGroup(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadCartPage();

    return () => controller.abort();
  }, [groupId]);

  useEffect(() => {
    if (!socket || !groupId || !userId) {
      return;
    }

    const handleCartUpdated = ({ cart: nextCart, totals: nextTotals }: CartUpdatedPayload) => {
      setCart((nextCart ?? []).map((item) => normalizeCartItem(item)));
      setTotals({
        itemCount: Number(nextTotals?.itemCount ?? 0),
        totalUnits: Number(nextTotals?.totalUnits ?? 0),
        cartTotal: Number(nextTotals?.cartTotal ?? 0),
      });
    };

    const sendHeartbeat = () => {
      socket.emit("heartbeat", {
        groupId,
        userId,
      });
    };

    socket.on("cart_updated", handleCartUpdated);
    socket.emit("join_room", {
      groupId,
      userId,
    });
    sendHeartbeat();

    const heartbeat = window.setInterval(sendHeartbeat, HEARTBEAT_MS);

    return () => {
      socket.off("cart_updated", handleCartUpdated);
      socket.emit("leave_room", {
        groupId,
        userId,
      });
      window.clearInterval(heartbeat);
    };
  }, [groupId, socket, userId]);

  function resetAddForm() {
    setItemName("");
    setPrice("");
    setQty("1");
    setPendingDuplicate(null);
    setSubmitError("");
  }

  function getParticipantName(contributorId: string) {
    return group?.participants.find((participant) => participant.id === contributorId)?.name ?? contributorId;
  }

  async function addItemToCart(itemNameToSend: string) {
    if (!groupId || !userId) {
      return;
    }

    const response = await fetch(`${GROUP_API_URL}/api/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupId,
        userId,
        itemName: itemNameToSend,
        pricePerUnit: Number(price),
        qty: Number(qty),
      }),
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Unable to add item"));
    }

    const payload = (await response.json()) as CartAddResponse;
    if (!payload.item) {
      throw new Error("Cart response was missing the added item.");
    }

    resetAddForm();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedItemName = itemName.trim();
    const parsedPrice = Number(price);
    const parsedQty = Number(qty);

    if (!groupId || !userId) {
      setSubmitError("Open this cart from the device you joined with.");
      return;
    }

    if (!trimmedItemName) {
      setSubmitError("Enter an item name first.");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setSubmitError("Price must be a positive number.");
      return;
    }

    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      setSubmitError("Qty must be a whole number greater than 0.");
      return;
    }

    if (group?.status !== "open") {
      setSubmitError("This cart is locked, so new items can't be added.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");
      setPendingDuplicate(null);

      const response = await fetch(`${GROUP_API_URL}/api/cart/check-duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId,
          itemName: trimmedItemName,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to check for duplicates"));
      }

      const payload = (await response.json()) as DuplicateCheckResponse;
      const match = payload.match ? normalizeCartItem(payload.match) : null;

      if (payload.confidence === "low" && match) {
        setPendingDuplicate(match);
        return;
      }

      const itemNameToSend =
        payload.confidence === "high" && match ? match.displayName : trimmedItemName;

      await addItemToCart(itemNameToSend);
    } catch (error) {
      console.error(error);
      setSubmitError(getErrorMessage(error, "We couldn't add that item right now."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDuplicateDecision(shouldMerge: boolean) {
    if (!pendingDuplicate || group?.status !== "open") {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");

      const itemNameToSend = shouldMerge ? pendingDuplicate.displayName : itemName.trim();
      await addItemToCart(itemNameToSend);
    } catch (error) {
      console.error(error);
      setSubmitError(getErrorMessage(error, "We couldn't add that item right now."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveMine(itemId: string) {
    if (!groupId || !userId || group?.status !== "open") {
      return;
    }

    try {
      setRemovingItemId(itemId);
      setSubmitError("");

      const response = await fetch(`${GROUP_API_URL}/api/cart/remove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId,
          userId,
          itemId,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to remove your contribution"));
      }

      await response.json();
    } catch (error) {
      console.error(error);
      setSubmitError(getErrorMessage(error, "We couldn't remove your contribution right now."));
    } finally {
      setRemovingItemId(null);
    }
  }

  if (!userId && !loading) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-[480px] rounded-[28px] border border-black/5 bg-white/90 p-6 shadow-card">
          <h1 className="text-2xl font-semibold text-[#151515]">Open this cart from your saved device.</h1>
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
          <p className="ml-3 text-sm font-medium text-[#625e53]">Loading cart...</p>
        </div>
      </main>
    );
  }

  if (!group) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-[480px] rounded-[28px] border border-red-100 bg-white/90 p-6 shadow-card">
          <h1 className="text-xl font-semibold text-[#151515]">Cart unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-[#625e53]">
            {pageError || "We couldn't load this cart right now."}
          </p>
          <button
            type="button"
            onClick={() => router.push(`/group/${groupId}`)}
            className="mt-5 w-full rounded-2xl bg-[#151515] px-4 py-3 text-sm font-semibold text-white"
          >
            Back to room
          </button>
        </div>
      </main>
    );
  }

  const grandTotal = totals.cartTotal + group.deliveryFee;
  const cartLocked = group.status !== "open";

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-[480px] space-y-4">
        <section className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#938f7d]">
                Add items
              </p>
              <h1 className="mt-2 truncate text-2xl font-semibold text-[#151515]">{group.name}</h1>
              <p className="mt-2 text-sm text-[#625e53]">{group.address}</p>
              {userName ? (
                <p className="mt-2 text-xs font-medium text-[#8a8576]">Adding as {userName}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => router.push(`/group/${group.id}`)}
              className="rounded-2xl border border-black/10 bg-[#fff8dc] px-4 py-3 text-sm font-semibold text-[#151515]"
            >
              Back
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div className="grid grid-cols-[minmax(0,1.7fr)_88px_72px_auto] gap-2">
              <input
                value={itemName}
                onChange={(event) => {
                  setItemName(event.target.value);
                  setPendingDuplicate(null);
                }}
                placeholder="Item name"
                className="min-w-0 rounded-2xl border border-black/10 bg-[#fffdf7] px-4 py-3 text-sm outline-none transition focus:border-black/30"
              />
              <input
                value={price}
                onChange={(event) => {
                  setPrice(event.target.value);
                  setPendingDuplicate(null);
                }}
                inputMode="decimal"
                placeholder="₹"
                className="min-w-0 rounded-2xl border border-black/10 bg-[#fffdf7] px-3 py-3 text-sm outline-none transition focus:border-black/30"
              />
              <input
                value={qty}
                onChange={(event) => {
                  setQty(event.target.value);
                  setPendingDuplicate(null);
                }}
                inputMode="numeric"
                placeholder="Qty"
                className="min-w-0 rounded-2xl border border-black/10 bg-[#fffdf7] px-3 py-3 text-sm outline-none transition focus:border-black/30"
              />
              <button
                type="submit"
                disabled={isSubmitting || cartLocked}
                className="rounded-2xl bg-[#FFD000] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "..." : "Add"}
              </button>
            </div>

            {pendingDuplicate ? (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-[#6d5800]">
                <p>
                  Looks like &quot;{pendingDuplicate.displayName}&quot; is already in cart. Same item?
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDuplicateDecision(true)}
                    disabled={isSubmitting || cartLocked}
                    className="rounded-full bg-[#FFD000] px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Yes, merge
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDuplicateDecision(false)}
                    disabled={isSubmitting || cartLocked}
                    className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#151515] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    No, add separately
                  </button>
                </div>
              </div>
            ) : null}

            {cartLocked ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                This cart is locked. You can still review items and head to settlement.
              </div>
            ) : null}

            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
          </form>
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[#151515]">Cart</h2>
            <span className="rounded-full bg-[#fff7d6] px-3 py-1 text-xs font-semibold text-[#8b7340]">
              {totals.itemCount} items
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {cart.length > 0 ? (
              cart.map((item) => {
                const contributedByMe = item.contributions.some(
                  (contribution) => contribution.userId === userId,
                );

                return (
                  <div
                    key={item.id}
                    className="rounded-[24px] border border-black/5 bg-[#fffdf7] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-[#151515]">
                          {item.displayName}
                        </p>
                        <p className="mt-1 text-sm text-[#625e53]">
                          {formatCurrency(item.pricePerUnit)}/unit
                        </p>
                      </div>

                      {contributedByMe ? (
                        <button
                          type="button"
                          onClick={() => void handleRemoveMine(item.id)}
                          disabled={removingItemId === item.id || cartLocked}
                          className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#151515] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {removingItemId === item.id ? "Removing..." : "Remove mine"}
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.contributions.map((contribution) => (
                        <span
                          key={`${item.id}-${contribution.userId}`}
                          className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800"
                        >
                          {getParticipantName(contribution.userId)} ×{contribution.qty}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm text-[#625e53]">
                      <span>Total qty: {item.totalQty}</span>
                      <span className="font-semibold text-[#151515]">
                        Total: {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-black/10 bg-[#fffaf0] px-4 py-6 text-sm text-[#6f6a5a]">
                No items yet. Add the first one above.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/5 bg-[#151515] p-5 text-white shadow-card">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/72">Cart total</span>
              <span>{formatCurrency(totals.cartTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/72">Delivery</span>
              <span>{formatCurrency(group.deliveryFee)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold">
              <span>Grand total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/group/${groupId}/settle`)}
            className="mt-5 w-full rounded-2xl bg-[#FFD000] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-95"
          >
            View split →
          </button>
        </section>
      </div>
    </main>
  );
}
