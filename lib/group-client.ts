import type { CartItem, Contribution, Group, Participant } from "@/types/group";

export const GROUP_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function parseTimestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const direct = Number(value);
    if (Number.isFinite(direct)) {
      return direct;
    }

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return Date.now();
}

export function normalizeParticipant(value: Partial<Participant>): Participant {
  return {
    id: String(value.id ?? ""),
    name: String(value.name ?? "Guest"),
    joinedAt: value.joinedAt ?? Date.now(),
    lastSeen: value.lastSeen ?? Date.now(),
    online: Boolean(value.online),
  };
}

function normalizeContribution(value: Partial<Contribution>): Contribution {
  return {
    userId: String(value.userId ?? ""),
    qty: Number(value.qty ?? 0),
  };
}

export function normalizeCartItem(item: Partial<CartItem>): CartItem {
  return {
    id: String(item.id ?? ""),
    displayName: String(item.displayName ?? "Untitled item"),
    normalizedName: String(item.normalizedName ?? ""),
    pricePerUnit: Number(item.pricePerUnit ?? 0),
    contributions: Array.isArray(item.contributions)
      ? item.contributions.map((contribution) => normalizeContribution(contribution))
      : [],
    totalQty: Number(item.totalQty ?? 0),
    totalPrice: Number(item.totalPrice ?? 0),
  };
}

export function normalizeGroup(raw: Partial<Group>): Group {
  return {
    id: String(raw.id ?? raw.code ?? ""),
    code: String(raw.code ?? raw.id ?? ""),
    name: String(raw.name ?? "Group order"),
    address: String(raw.address ?? "Address pending"),
    hostId: String(raw.hostId ?? ""),
    status: (raw.status ?? "open") as Group["status"],
    createdAt: raw.createdAt ?? Date.now(),
    expiresAt: raw.expiresAt ?? Date.now(),
    participants: Array.isArray(raw.participants)
      ? raw.participants.map((participant) => normalizeParticipant(participant))
      : [],
    cart: Array.isArray(raw.cart) ? raw.cart.map((item) => normalizeCartItem(item)) : [],
    deliveryFee: Number(raw.deliveryFee ?? 0),
    settlement: {
      upiId: raw.settlement?.upiId ?? null,
      hostName: raw.settlement?.hostName ?? null,
      payments: Object.entries(raw.settlement?.payments ?? {}).reduce<Group["settlement"]["payments"]>(
        (payments, [userId, status]) => {
          if (status === "paid") {
            payments[userId] = "paid";
          }

          return payments;
        },
        {},
      ),
    },
  };
}

export function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + Number(item.totalPrice ?? 0), 0);
}

export function calculateGrandTotal(cart: CartItem[], deliveryFee = 0): number {
  return calculateCartTotal(cart) + deliveryFee;
}

export function formatCountdown(timeLeft: number): string {
  const totalSeconds = Math.max(0, Math.floor(timeLeft / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatCurrency(value: number | string): string {
  const numericValue = Number(value ?? 0);
  const amount = Number.isFinite(numericValue) ? numericValue : 0;
  const hasDecimals = Math.abs(amount % 1) > Number.EPSILON;

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function calculateParticipantTotals(group: Group, cart: CartItem[]) {
  return group.participants.reduce<Record<string, number>>((totals, participant) => {
    totals[participant.id] = 0;
    return totals;
  }, {});
}

export function buildShareLines(group: Group, cart: CartItem[]): string[] {
  if (!group.settlement.upiId || group.participants.length === 0) {
    return [];
  }

  const participantTotals = calculateParticipantTotals(group, cart);
  cart.forEach((item) => {
    item.contributions.forEach((contribution) => {
      participantTotals[contribution.userId] =
        (participantTotals[contribution.userId] ?? 0) + contribution.qty * item.pricePerUnit;
    });
  });

  const participantCount = group.participants.length;
  const baseDeliveryShare =
    participantCount > 0 ? Math.floor(group.deliveryFee / participantCount) : 0;

  return group.participants
    .filter((participant) => participant.id !== group.hostId)
    .map((participant) => {
      const itemsTotal = participantTotals[participant.id] ?? 0;
      const share = itemsTotal + baseDeliveryShare;
      const target = ` to ${group.settlement.upiId}`;

      return `• ${participant.name} — ${formatCurrency(share)}${target}`;
    });
}

export function buildWhatsAppMessage(group: Group, cart: CartItem[]): string {
  const cartTotal = calculateCartTotal(cart);
  const shareLines = group.settlement.upiId ? buildShareLines(group, cart).join("\n") : "";

  return [
    `🛒 Group Order — ${group.name}`,
    `📍 Deliver to: ${group.address}`,
    "",
    ...cart.map(
      (item) => `• ${item.displayName} x${item.totalQty} — ${formatCurrency(item.totalPrice)}`,
    ),
    "",
    `🛵 Delivery: ${formatCurrency(group.deliveryFee)}`,
    `💰 Total: ${formatCurrency(cartTotal + group.deliveryFee)}`,
    "",
    ...(group.settlement.upiId ? ["💸 Pay your share:", shareLines] : []),
  ]
    .join("\n")
    .trim();
}
