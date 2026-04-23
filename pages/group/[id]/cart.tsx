import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { calculateCartTotal, calculateGrandTotal } from "@/lib/group-client";

import { useGroup } from "@/hooks/useGroup";

export default function GroupCartPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const groupId = typeof router.query.id === "string" ? router.query.id : undefined;
  const { group, cart, loading } = useGroup(groupId);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setUserId(window.localStorage.getItem("userId"));
  }, []);

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

  if (loading || !group) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-[480px] rounded-[28px] border border-black/5 bg-white/90 p-6 shadow-card">
          <p className="text-sm font-medium text-[#625e53]">Loading cart...</p>
        </div>
      </main>
    );
  }

  const cartTotal = calculateCartTotal(cart);
  const grandTotal = calculateGrandTotal(cart, group.deliveryFee);

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-[480px] space-y-4">
        <section className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#938f7d]">
                Group cart
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-[#151515]">{group.name}</h1>
              <p className="mt-2 text-sm text-[#625e53]">{group.address}</p>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/group/${group.id}`)}
              className="rounded-2xl border border-black/10 bg-[#fff8dc] px-4 py-3 text-sm font-semibold text-[#151515]"
            >
              Back to room
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-card">
          <div className="space-y-3">
            {cart.length > 0 ? (
              cart.map((item, index) => (
                <div
                  key={`${item.displayName}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#fffdf7] px-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#151515]">
                      {item.displayName}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8a8576]">
                      Qty {item.totalQty}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#151515]">
                    ₹{Math.round(item.totalPrice)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-black/10 bg-[#fffaf0] px-4 py-6 text-sm text-[#6f6a5a]">
                No items have landed in the cart yet.
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3 rounded-[24px] bg-[#151515] px-4 py-4 text-white">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/72">Cart total</span>
              <span>₹{Math.round(cartTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/72">Delivery fee</span>
              <span>₹{Math.round(group.deliveryFee)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold">
              <span>Total</span>
              <span>₹{Math.round(grandTotal)}</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
