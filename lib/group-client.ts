import type { CartItem, Group, Participant } from "@/types/group";

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

export function normalizeCartItem(item: Partial<CartItem>): CartItem {
  return {
    ...item,
    displayName: String(item.displayName ?? "Untitled item"),
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
      payments: raw.settlement?.payments ?? {},
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

export function buildShareLines(group: Group, cart: CartItem[]): string[] {
  const total = calculateGrandTotal(cart, group.deliveryFee);
  const entries = Object.entries(group.settlement.payments ?? {}).filter(([, amount]) =>
    Number.isFinite(amount),
  );

  if (entries.length > 0) {
    return entries.map(([participantId, amount]) => {
      const participant = group.participants.find((item) => item.id === participantId);
      const label = participant?.name ?? participantId;
      const target = group.settlement.upiId ? ` to ${group.settlement.upiId}` : "";
      return `• ${label} — ₹${Math.round(amount)}${target}`;
    });
  }

  if (!group.settlement.upiId || group.participants.length === 0) {
    return [];
  }

  const share = Math.round(total / group.participants.length);
  return group.participants.map((participant) => {
    return `• ${participant.name} — ₹${share} to ${group.settlement.upiId}`;
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
      (item) => `• ${item.displayName} x${item.totalQty} — ₹${Math.round(item.totalPrice)}`,
    ),
    "",
    `🛵 Delivery: ₹${Math.round(group.deliveryFee)}`,
    `💰 Total: ₹${Math.round(cartTotal + group.deliveryFee)}`,
    "",
    ...(group.settlement.upiId ? ["💸 Pay your share:", shareLines] : []),
  ]
    .join("\n")
    .trim();
}
