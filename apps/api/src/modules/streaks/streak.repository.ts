import { PrismaClient } from '@prisma/client'
import { StreakPublic } from '../../shared/types'

export class StreakRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByUserId(userId: string): Promise<StreakPublic | null> {
    const streak = await this.db.streak.findUnique({ where: { userId } })
    if (!streak) return null
    return this.toPublic(streak)
  }

  async upsert(userId: string, count: number, lastCompletedAt: Date, badgeExpiresAt: Date | null): Promise<StreakPublic> {
    const streak = await this.db.streak.upsert({
      where: { userId },
      create: { userId, count, lastCompletedAt, badgeExpiresAt },
      update: { count, lastCompletedAt, badgeExpiresAt },
    })
    return this.toPublic(streak)
  }

  private toPublic(streak: {
    id: string
    userId: string
    count: number
    lastCompletedAt: Date | null
    badgeExpiresAt: Date | null
  }): StreakPublic {
    return {
      ...streak,
      isActive: Boolean(streak.badgeExpiresAt && streak.badgeExpiresAt > new Date()),
    }
  }
}
