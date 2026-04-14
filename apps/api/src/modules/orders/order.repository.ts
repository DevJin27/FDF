import { OrderStatus, PrismaClient, SessionStatus } from '@prisma/client'
import { OrderFactory } from '../../patterns/order-factory'
import { ORDER_INCLUDE, serializeOrder, SessionPublic } from '../../shared/types'

export class OrderRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string) {
    const order = await this.db.order.findUnique({ where: { id }, include: ORDER_INCLUDE })
    return order ? serializeOrder(order) : null
  }

  async findBySessionId(sessionId: string) {
    const order = await this.db.order.findUnique({ where: { sessionId }, include: ORDER_INCLUDE })
    return order ? serializeOrder(order) : null
  }

  async createFromSession(session: SessionPublic) {
    const snapshot = OrderFactory.create({
      sessionId: session.id,
      leaderId: session.leaderId,
      cartItems: session.cartItems,
    })

    const order = await this.db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          ...snapshot.order,
          items: { create: snapshot.items },
        },
        include: ORDER_INCLUDE,
      })

      await tx.session.update({
        where: { id: session.id },
        data: { status: SessionStatus.SETTLED },
      })

      return created
    })

    return serializeOrder(order)
  }

  async markPaid(id: string) {
    const order = await this.db.order.update({
      where: { id },
      data: { status: OrderStatus.PAID, paidAt: new Date() },
      include: ORDER_INCLUDE,
    })
    return serializeOrder(order)
  }
}
