import { OrderStatus, Platform, Prisma, SessionStatus } from '@prisma/client'
import { toNumber } from './money'

export interface JwtPayload {
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
  createdAt: Date
}

export interface SettlementPublic {
  id: string
  sessionId: string
  orderId: string | null
  memberId: string
  amountOwed: number
  paid: boolean
  paidAt: Date | null
}

export interface MemberPublic {
  id: string
  sessionId: string
  userId: string
  user: UserPublic
  joinedAt: Date
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
  deadline: Date
  status: SessionStatus
  createdAt: Date
  members: MemberPublic[]
  cartItems: CartItemPublic[]
  settlements: SettlementPublic[]
  orders: { id: string; status: OrderStatus; subtotal: number; createdAt: Date }[]
}

export interface OrderItemPublic {
  id: string
  orderId: string
  memberId: string
  itemId: string | null
  name: string
  price: number
  quantity: number
  createdAt: Date
}

export interface OrderPublic {
  id: string
  sessionId: string
  leaderId: string
  status: OrderStatus
  subtotal: number
  paidAt: Date | null
  createdAt: Date
  items: OrderItemPublic[]
  settlements: SettlementPublic[]
}

export interface StreakPublic {
  id: string
  userId: string
  count: number
  lastCompletedAt: Date | null
  badgeExpiresAt: Date | null
  isActive: boolean
}

export interface CreateSessionDto {
  name: string
  platform: Platform
  minOrder: number
  durationMinutes: number
  leaderId: string
}

export interface CreateCartItemDto {
  sessionId: string
  memberId: string
  itemId?: string
  name: string
  price: number
  quantity: number
}

export type SseEventName =
  | 'MEMBER_JOINED'
  | 'ITEM_ADDED'
  | 'ITEM_REMOVED'
  | 'SESSION_LOCKED'
  | 'SETTLEMENT_UPDATED'
  | 'TICK'

export const SESSION_INCLUDE = {
  leader: { select: { id: true, phone: true, name: true, upiId: true } },
  members: {
    include: {
      user: { select: { id: true, phone: true, name: true, upiId: true } },
      cartItems: { orderBy: { createdAt: 'asc' as const } },
      settlements: true,
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  cartItems: { orderBy: { createdAt: 'asc' as const } },
  settlements: true,
  orders: { select: { id: true, status: true, subtotal: true, createdAt: true } },
} satisfies Prisma.SessionInclude

export const ORDER_INCLUDE = {
  items: { orderBy: { createdAt: 'asc' as const } },
  settlements: true,
} satisfies Prisma.OrderInclude

export type SessionRecord = Prisma.SessionGetPayload<{ include: typeof SESSION_INCLUDE }>
export type OrderRecord = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>

export function serializeCartItem(item: {
  id: string
  sessionId: string
  memberId: string
  itemId: string | null
  name: string
  price: Prisma.Decimal
  quantity: number
  createdAt: Date
}): CartItemPublic {
  return {
    ...item,
    price: toNumber(item.price),
  }
}

export function serializeSettlement(settlement: {
  id: string
  sessionId: string
  orderId: string | null
  memberId: string
  amountOwed: Prisma.Decimal
  paid: boolean
  paidAt: Date | null
}): SettlementPublic {
  return {
    ...settlement,
    amountOwed: toNumber(settlement.amountOwed),
  }
}

export function serializeItem(item: {
  id: string
  platform: Platform
  name: string
  description: string | null
  price: Prisma.Decimal
  imageUrl: string | null
  active: boolean
}): ItemPublic {
  return {
    ...item,
    price: toNumber(item.price),
  }
}

export function serializeSession(session: SessionRecord): SessionPublic {
  return {
    id: session.id,
    code: session.code,
    name: session.name,
    leaderId: session.leaderId,
    leader: session.leader,
    platform: session.platform,
    minOrder: toNumber(session.minOrder),
    deadline: session.deadline,
    status: session.status,
    createdAt: session.createdAt,
    members: session.members.map((member) => ({
      id: member.id,
      sessionId: member.sessionId,
      userId: member.userId,
      user: member.user,
      joinedAt: member.joinedAt,
      cartItems: member.cartItems.map(serializeCartItem),
      settlements: member.settlements.map(serializeSettlement),
    })),
    cartItems: session.cartItems.map(serializeCartItem),
    settlements: session.settlements.map(serializeSettlement),
    orders: session.orders.map((order) => ({
      id: order.id,
      status: order.status,
      subtotal: toNumber(order.subtotal),
      createdAt: order.createdAt,
    })),
  }
}

export function serializeOrder(order: OrderRecord): OrderPublic {
  return {
    id: order.id,
    sessionId: order.sessionId,
    leaderId: order.leaderId,
    status: order.status,
    subtotal: toNumber(order.subtotal),
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      ...item,
      price: toNumber(item.price),
    })),
    settlements: order.settlements.map(serializeSettlement),
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}
