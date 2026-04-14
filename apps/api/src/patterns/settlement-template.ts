import { Prisma } from '@prisma/client'
import { roundMoney, sumMoney, toNumber } from '../shared/money'
import { SessionPublic } from '../shared/types'

export interface SettlementDraft {
  sessionId: string
  orderId?: string
  memberId: string
  amountOwed: Prisma.Decimal
}

export interface SettlementContext {
  session: SessionPublic
  orderId?: string
}

export abstract class SettlementTemplate {
  async run(context: SettlementContext): Promise<SettlementDraft[]> {
    this.validate(context)
    return this.calculate(context)
  }

  protected validate(context: SettlementContext): void {
    if (context.session.members.length === 0) {
      throw new Error('Session must have members before settlement')
    }
  }

  protected abstract calculate(context: SettlementContext): Promise<SettlementDraft[]>
}

// Pattern: Template Method - fixed validate -> calculate workflow.
export class CartValueSettlementTemplate extends SettlementTemplate {
  protected async calculate(context: SettlementContext): Promise<SettlementDraft[]> {
    return context.session.members.map((member) => {
      const total = sumMoney(member.cartItems.map((item) => item.price * item.quantity))
      return {
        sessionId: context.session.id,
        orderId: context.orderId,
        memberId: member.id,
        amountOwed: roundMoney(toNumber(total)),
      }
    })
  }
}
