import { eventBus } from '../../patterns/event-bus'
import { quotePrice } from '../../patterns/pricing-strategy'
import { AppError } from '../../shared/http'
import { CartItemPublic } from '../../shared/types'
import { SessionRepository } from '../sessions/session.repository'
import { CartRepository } from './cart.repository'

export class CartService {
  constructor(
    private readonly cartRepo: CartRepository,
    private readonly sessionRepo: SessionRepository
  ) {}

  async addItem(sessionCode: string, userId: string, input: { memberId: string; itemId?: string; name: string; price: number; quantity: number }) {
    const session = await this.sessionRepo.findByCode(sessionCode)
    if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND')
    if (session.status !== 'OPEN') throw new AppError('Session is not open', 409, 'SESSION_CLOSED')

    const member = await this.sessionRepo.findMember(session.id, userId)
    if (!member || member.id !== input.memberId) {
      throw new AppError('You can only add items to your own cart', 403, 'FORBIDDEN')
    }

    const item = await this.cartRepo.addItem({
      sessionId: session.id,
      memberId: input.memberId,
      itemId: input.itemId,
      name: input.name.trim(),
      price: input.price,
      quantity: input.quantity,
    })

    eventBus.emit(session.id, 'ITEM_ADDED', { sessionId: session.id, item })
    return item
  }

  async removeItem(sessionCode: string, itemId: string, userId: string): Promise<void> {
    const session = await this.sessionRepo.findByCode(sessionCode)
    if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND')
    if (session.status !== 'OPEN') throw new AppError('Session is not open', 409, 'SESSION_CLOSED')

    const item = await this.cartRepo.findById(itemId)
    if (!item) throw new AppError('Item not found', 404, 'ITEM_NOT_FOUND')

    const member = await this.sessionRepo.findMember(session.id, userId)
    if (!member || member.id !== item.memberId) {
      throw new AppError('You can only remove your own items', 403, 'FORBIDDEN')
    }

    await this.cartRepo.removeItem(itemId)
    eventBus.emit(session.id, 'ITEM_REMOVED', { sessionId: session.id, itemId })
  }

  quote(sessionMinOrder: number, platform: Parameters<typeof quotePrice>[0]['platform'], items: CartItemPublic[]) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return quotePrice({ subtotal, platform, minimumOrder: sessionMinOrder })
  }
}
