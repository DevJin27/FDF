export type ApiTimestamp = string | number;

export type PaymentMap = Record<string, number>;

export type CartItem = {
  id?: string;
  displayName: string;
  totalQty: number;
  totalPrice: number;
  [key: string]: unknown;
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

export type CartUpdatedPayload = {
  cart: CartItem[];
  totals: {
    itemCount: number;
    totalUnits: number;
    cartTotal: number;
  };
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
