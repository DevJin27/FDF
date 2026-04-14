import { PrismaClient } from '@prisma/client'
import { SettlementDraft } from '../../patterns/settlement-template'
import { serializeSettlement } from '../../shared/types'

export class SettlementRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertMany(drafts: SettlementDraft[]): Promise<void> {
    for (const draft of drafts) {
      await this.db.settlement.upsert({
        where: {
          sessionId_memberId: {
            sessionId: draft.sessionId,
            memberId: draft.memberId,
          },
        },
        create: {
          sessionId: draft.sessionId,
          orderId: draft.orderId ?? null,
          memberId: draft.memberId,
          amountOwed: draft.amountOwed,
        },
        update: {
          orderId: draft.orderId ?? null,
          amountOwed: draft.amountOwed,
        },
      })
    }
  }

  async findBySession(sessionId: string) {
    const settlements = await this.db.settlement.findMany({ where: { sessionId } })
    return settlements.map(serializeSettlement)
  }

  async markPaidForSession(sessionId: string, memberId: string) {
    const settlement = await this.db.settlement.update({
      where: { sessionId_memberId: { sessionId, memberId } },
      data: { paid: true, paidAt: new Date() },
    })
    return serializeSettlement(settlement)
  }
}
