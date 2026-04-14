import { Platform } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { createSessionSchema } from '../src/modules/sessions/session.schemas'
import { OrderFactory } from '../src/patterns/order-factory'
import { quotePrice } from '../src/patterns/pricing-strategy'
import { CartValueSettlementTemplate } from '../src/patterns/settlement-template'
import { SessionPublic } from '../src/shared/types'

const now = new Date()

const baseSession: SessionPublic = {
  id: 'session-1',
  code: 'ABC12345',
  name: 'Test session',
  leaderId: 'user-1',
  leader: { id: 'user-1', phone: '9999999999', name: 'Host', upiId: null },
  platform: Platform.SWIGGY,
  minOrder: 499,
  deadline: now,
  status: 'LOCKED',
  createdAt: now,
  cartItems: [
    {
      id: 'cart-1',
      sessionId: 'session-1',
      memberId: 'member-1',
      itemId: null,
      name: 'Wrap',
      price: 120,
      quantity: 2,
      createdAt: now,
    },
    {
      id: 'cart-2',
      sessionId: 'session-1',
      memberId: 'member-2',
      itemId: null,
      name: 'Coffee',
      price: 80,
      quantity: 1,
      createdAt: now,
    },
  ],
  members: [
    {
      id: 'member-1',
      sessionId: 'session-1',
      userId: 'user-1',
      user: { id: 'user-1', phone: '9999999999', name: 'Host', upiId: null },
      joinedAt: now,
      settlements: [],
      cartItems: [
        {
          id: 'cart-1',
          sessionId: 'session-1',
          memberId: 'member-1',
          itemId: null,
          name: 'Wrap',
          price: 120,
          quantity: 2,
          createdAt: now,
        },
      ],
    },
    {
      id: 'member-2',
      sessionId: 'session-1',
      userId: 'user-2',
      user: { id: 'user-2', phone: '8888888888', name: 'Member', upiId: null },
      joinedAt: now,
      settlements: [],
      cartItems: [
        {
          id: 'cart-2',
          sessionId: 'session-1',
          memberId: 'member-2',
          itemId: null,
          name: 'Coffee',
          price: 80,
          quantity: 1,
          createdAt: now,
        },
      ],
    },
  ],
  settlements: [],
  orders: [],
}

describe('pricing strategy', () => {
  it('quotes the delivery gap and platform fee', () => {
    const quote = quotePrice({ platform: Platform.SWIGGY, subtotal: 320, minimumOrder: 499 })

    expect(quote.deliveryGap).toBe(179)
    expect(quote.qualifiesForFreeDelivery).toBe(false)
    expect(quote.payableTotal).toBe(327)
  })
})

describe('order factory', () => {
  it('creates an immutable order snapshot from cart items', () => {
    const snapshot = OrderFactory.create({
      sessionId: baseSession.id,
      leaderId: baseSession.leaderId,
      cartItems: baseSession.cartItems,
    })

    expect(snapshot.order.subtotal.toNumber()).toBe(320)
    expect(snapshot.items).toHaveLength(2)
    expect(snapshot.items[0].name).toBe('Wrap')
  })
})

describe('settlement template', () => {
  it('calculates amount owed per member cart', async () => {
    const template = new CartValueSettlementTemplate()
    const settlements = await template.run({ session: baseSession, orderId: 'order-1' })

    expect(settlements).toHaveLength(2)
    expect(settlements.find((entry) => entry.memberId === 'member-1')?.amountOwed.toNumber()).toBe(240)
    expect(settlements.find((entry) => entry.memberId === 'member-2')?.amountOwed.toNumber()).toBe(80)
  })
})

describe('session validation', () => {
  it('rejects invalid minimum order values', () => {
    expect(() =>
      createSessionSchema.parse({
        name: 'Bad',
        platform: Platform.SWIGGY,
        minOrder: 0,
        durationMinutes: 10,
      })
    ).toThrow()
  })
})
