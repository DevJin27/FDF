import { eventBus } from '../../patterns/event-bus'
import { AppError } from '../../shared/http'
import { SettlementService } from '../settlements/settlement.service'
import { SessionRepository } from '../sessions/session.repository'
import { OrderRepository } from './order.repository'

export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly settlementService: SettlementService
  ) {}

  async createOrder(sessionCode: string, requesterId: string) {
    const session = await this.sessionRepo.findByCode(sessionCode)
    if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND')
    if (session.leaderId !== requesterId) throw new AppError('Only the leader can create the order', 403, 'FORBIDDEN')
    if (session.status !== 'LOCKED') throw new AppError('Lock the session before creating an order', 409, 'SESSION_NOT_LOCKED')
    if (session.cartItems.length === 0) throw new AppError('Cart is empty', 409, 'EMPTY_CART')

    const existing = await this.orderRepo.findBySessionId(session.id)
    const order = existing ?? (await this.orderRepo.createFromSession(session))
    await this.settlementService.calculateAndPersistForSession(session, order.id)
    eventBus.emit(session.id, 'SETTLEMENT_UPDATED', { sessionId: session.id, orderId: order.id })
    return (await this.orderRepo.findById(order.id)) ?? order
  }

  async getOrder(id: string) {
    const order = await this.orderRepo.findById(id)
    if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND')
    return order
  }
}
