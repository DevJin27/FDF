export type DeliveryCluster = "hostel-a" | "hostel-b" | "main-gate" | "library";
export type OrderIntentStatus = "open" | "reserved" | "matched" | "cancelled" | "expired";
export type MatchRoomStatus =
  | "pending_confirmation"
  | "active"
  | "locked"
  | "completed"
  | "cancelled"
  | "expired";
export type PaymentStatus = "pending" | "paid";

export interface OrderIntent {
  id: string;
  userId: string;
  amount: number;
  latestCheckoutAt: string;
  deliveryCluster: DeliveryCluster;
  status: OrderIntentStatus;
  createdAt: string;
  roomId: string | null;
}

export interface QueueSnapshot {
  deliveryCluster: DeliveryCluster;
  openIntentCount: number;
  totalOpenAmount: number;
  amountToMinimum: number;
  minimumAmount: number;
}

export interface MatchRoom {
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

export interface SettlementMember {
  userId: string;
  name: string | null;
  image: string | null;
  amountOwed: number;
  paymentStatus: PaymentStatus;
  upiId: string | null;
  isLeader: boolean;
}

export interface SettlementView {
  leader: {
    userId: string;
    name: string | null;
    upiId: string | null;
  };
  members: SettlementMember[];
}

export interface MatchRoomResponse {
  room: MatchRoom;
  settlement: SettlementView | null;
}
