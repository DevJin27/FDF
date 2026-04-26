export const DELIVERY_CLUSTERS = [
  "hostel-a",
  "hostel-b",
  "main-gate",
  "library"
] as const;

export type DeliveryCluster = (typeof DELIVERY_CLUSTERS)[number];

export const ORDER_INTENT_STATUSES = [
  "open",
  "reserved",
  "matched",
  "cancelled",
  "expired"
] as const;

export type OrderIntentStatus = (typeof ORDER_INTENT_STATUSES)[number];

export const MATCH_ROOM_STATUSES = [
  "pending_confirmation",
  "active",
  "locked",
  "completed",
  "cancelled",
  "expired"
] as const;

export type MatchRoomStatus = (typeof MATCH_ROOM_STATUSES)[number];

export const SETTLEMENT_STATUSES = ["pending", "paid"] as const;

export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

export interface OrderIntentSummary {
  id: string;
  userId: string;
  amount: number;
  latestCheckoutAt: string;
  deliveryCluster: DeliveryCluster;
  status: OrderIntentStatus;
  createdAt: string;
  roomId: string | null;
}

export interface MatchRoomSummary {
  id: string;
  leaderUserId: string;
  memberCount: number;
  totalAmount: number;
  minimumAmount: number;
  latestCheckoutAt: string;
  status: MatchRoomStatus;
  deliveryCluster: DeliveryCluster;
  createdAt: string;
}

export interface SettlementMemberView {
  userId: string;
  name: string | null;
  image: string | null;
  amountOwed: number;
  paymentStatus: SettlementStatus;
  upiId: string | null;
  isLeader: boolean;
}

export interface SettlementView {
  leader: {
    userId: string;
    name: string | null;
    upiId: string | null;
  };
  members: SettlementMemberView[];
}

export interface QueueSnapshot {
  deliveryCluster: DeliveryCluster;
  openIntentCount: number;
  totalOpenAmount: number;
  amountToMinimum: number;
  minimumAmount: number;
}

export interface DomainEventMap {
  "queue.updated": {
    cluster: DeliveryCluster;
    snapshot: QueueSnapshot;
  };
  "intent.created": {
    intent: OrderIntentSummary;
  };
  "intent.cancelled": {
    intentId: string;
    cluster: DeliveryCluster;
  };
  "match.formed": {
    roomId: string;
    userIds: string[];
    cluster: DeliveryCluster;
  };
  "match.updated": {
    roomId: string;
  };
  "match.locked": {
    roomId: string;
    leaderUserId: string;
  };
  "payment.updated": {
    roomId: string;
    memberUserId: string;
  };
}
