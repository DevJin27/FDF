export type ApiTimestamp = string | number;

export type PaymentStatus = "paid";

export type PaymentMap = Record<string, PaymentStatus>;

export type Contribution = {
  userId: string;
  qty: number;
};

export type CartItem = {
  id: string;
  displayName: string;
  normalizedName: string;
  pricePerUnit: number;
  contributions: Contribution[];
  totalQty: number;
  totalPrice: number;
};

export type Participant = {
  id: string;
  name: string;
  joinedAt: ApiTimestamp;
  lastSeen: ApiTimestamp;
  online: boolean;
};

export type GroupStatus = "open" | "locked" | "ordered";

export type GroupSettlement = {
  upiId?: string | null;
  hostName?: string | null;
  payments: PaymentMap;
};

export type Group = {
  id: string;
  code: string;
  name: string;
  address: string;
  hostId: string;
  status: GroupStatus;
  createdAt: ApiTimestamp;
  expiresAt: ApiTimestamp;
  participants: Participant[];
  cart: CartItem[];
  deliveryFee: number;
  settlement: GroupSettlement;
};

export type GroupResponse = {
  group: Group;
};

export type CreateGroupResponse = {
  groupId: string;
  code: string;
  group: Group;
};

export type JoinGroupResponse = {
  group: Group;
};

export type CartTotals = {
  itemCount: number;
  totalUnits: number;
  cartTotal: number;
};

export type CartResponse = {
  cart: CartItem[];
  totals: CartTotals;
};

export type CartAddResponse = {
  item: CartItem;
  merged: boolean;
  cart: CartItem[];
  totals: CartTotals;
};

export type CartRemoveResponse = {
  cart: CartItem[];
  totals: CartTotals;
};

export type DuplicateCheckResponse = {
  match: CartItem | null;
  confidence: "high" | "low" | "none";
};

export type CartUpdatedPayload = {
  cart: CartItem[];
  totals: CartTotals;
};

export type SplitParticipant = {
  userId: string;
  userName: string;
  isHost: boolean;
  itemsTotal: string;
  deliveryShare: string;
  grandTotal: string;
  owesTo: string | null;
  owesAmount: string | null;
  upiLink: string | null;
};

export type SplitResponse = {
  participants: SplitParticipant[];
  cartTotal: string;
  deliveryFee: string;
  grandTotal: string;
  hostId: string;
  hostName: string;
};

export type SplitSummaryItem = {
  name: string;
  owes: string;
  upiLink: string | null;
};

export type SplitSummaryResponse = {
  breakdown: SplitSummaryItem[];
  hostCollects: string;
};

export type HostChangedPayload = {
  newHostId: string;
  newHostName: string;
};

export type UserJoinedPayload = {
  participant: Participant;
};

export type UserLeftPayload = {
  userId: string;
};

export type SessionWarningPayload = {
  minutesLeft: 5;
};

export type GroupLockedPayload = {
  finalCart: CartItem[];
};
