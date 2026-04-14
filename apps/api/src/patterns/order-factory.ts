import { OrderStatus, Prisma } from '@prisma/client'
import { roundMoney, sumMoney } from '../shared/money'
import { CartItemPublic } from '../shared/types'

export interface OrderFactoryInput {
  sessionId: string
  leaderId: string
  cartItems: CartItemPublic[]
}

// Pattern: Factory - creates immutable order snapshots from current cart state.
export class OrderFactory {
  static create(input: OrderFactoryInput) {
    const subtotal = sumMoney(input.cartItems.map((item) => item.price * item.quantity))

    return {
      order: {
        sessionId: input.sessionId,
        leaderId: input.leaderId,
        status: OrderStatus.PAID,
        subtotal: roundMoney(subtotal),
        paidAt: new Date(),
      },
      items: input.cartItems.map((item) => ({
        memberId: item.memberId,
        itemId: item.itemId,
        name: item.name,
        price: new Prisma.Decimal(item.price),
        quantity: item.quantity,
      })),
    }
  }
}
