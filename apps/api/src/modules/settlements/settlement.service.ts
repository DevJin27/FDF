import { eventBus } from '../../patterns/event-bus'
import { CartValueSettlementTemplate } from '../../patterns/settlement-template'
import { AppError } from '../../shared/http'
import { SessionPublic } from '../../shared/types'
import { SessionRepository } from '../sessions/session.repository'
import { SettlementRepository } from './settlement.repository'

export class SettlementService {
  private readonly template = new CartValueSettlementTemplate()

  constructor(
    private readonly settlementRepo: SettlementRepository,
    private readonly sessionRepo: SessionRepository
  ) {}

  async calculateAndPersist(sessionCode: string, requesterId: string, orderId?: string) {
    const session = await this.requireLeaderSession(sessionCode, requesterId)
    return this.calculateAndPersistForSession(session, orderId)
  }

  async calculateAndPersistForSession(session: SessionPublic, orderId?: string) {
    const drafts = await this.template.run({ session, orderId })
    await this.settlementRepo.upsertMany(drafts)
    const settlements = await this.settlementRepo.findBySession(session.id)
    eventBus.emit(session.id, 'SETTLEMENT_UPDATED', { sessionId: session.id, settlements })
    return settlements
  }

  async getBreakdown(sessionCode: string) {
    const session = await this.sessionRepo.findByCode(sessionCode)
    if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND')

    const persisted = await this.settlementRepo.findBySession(session.id)
    return session.members.map((member) => {
      const settlement = persisted.find((entry) => entry.memberId === member.id)
      const cartTotal = member.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      return {
        memberId: member.id,
        userId: member.userId,
        userName: member.user.name,
        amountOwed: settlement?.amountOwed ?? cartTotal,
        paid: settlement?.paid ?? false,
        paidAt: settlement?.paidAt ?? null,
      }
    })
  }

  async markPaid(sessionCode: string, memberId: string, requesterId: string) {
    const session = await this.requireLeaderSession(sessionCode, requesterId)
    const settlement = await this.settlementRepo.markPaidForSession(session.id, memberId)
    eventBus.emit(session.id, 'SETTLEMENT_UPDATED', { sessionId: session.id, settlement })
    return settlement
  }

  private async requireLeaderSession(sessionCode: string, requesterId: string) {
    const session = await this.sessionRepo.findByCode(sessionCode)
    if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND')
    if (session.leaderId !== requesterId) throw new AppError('Only the leader can update settlement', 403, 'FORBIDDEN')
    return session
  }
}
