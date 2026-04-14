export type Platform = 'BLINKIT' | 'SWIGGY' | 'ZEPTO'
export type SessionStatus = 'OPEN' | 'LOCKED' | 'SETTLED'
export type OrderStatus = 'CREATED' | 'PAID' | 'CANCELLED'

export interface CurrentUser {
  userId: string
  phone: string
}

export interface UserPublic {
  id: string
  phone: string
  name: string | null
  upiId: string | null
}

export interface ItemPublic {
  id: string
  platform: Platform
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  active: boolean
}

export interface CartItemPublic {
  id: string
  sessionId: string
  memberId: string
  itemId: string | null
  name: string
  price: number
  quantity: number
  createdAt: string
}

export interface SettlementPublic {
  id?: string
  sessionId?: string
  orderId?: string | null
  memberId: string
  userId?: string
  userName?: string | null
  amountOwed: number
  paid: boolean
  paidAt: string | null
}

export interface MemberPublic {
  id: string
  sessionId: string
  userId: string
  user: UserPublic
  joinedAt: string
  cartItems: CartItemPublic[]
  settlements: SettlementPublic[]
}

export interface SessionPublic {
  id: string
  code: string
  name: string
  leaderId: string
  leader: UserPublic
  platform: Platform
  minOrder: number
  deadline: string
  status: SessionStatus
  createdAt: string
  members: MemberPublic[]
  cartItems: CartItemPublic[]
  settlements: SettlementPublic[]
  orders: { id: string; status: OrderStatus; subtotal: number; createdAt: string }[]
}

export interface StreakPublic {
  id: string
  userId: string
  count: number
  lastCompletedAt: string | null
  badgeExpiresAt: string | null
  isActive: boolean
}

export interface OrderPublic {
  id: string
  sessionId: string
  leaderId: string
  status: OrderStatus
  subtotal: number
  paidAt: string | null
  createdAt: string
  items: CartItemPublic[]
  settlements: SettlementPublic[]
}
