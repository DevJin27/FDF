import { StreakPublic } from '../../shared/types'
import { StreakRepository } from './streak.repository'

const weekMs = 7 * 24 * 60 * 60 * 1000
const dayMs = 24 * 60 * 60 * 1000
const badgeMs = 30 * dayMs

export class StreakService {
  constructor(private readonly streakRepo: StreakRepository) {}

  async getStreak(userId: string): Promise<StreakPublic> {
    return (
      (await this.streakRepo.findByUserId(userId)) ?? {
        id: '',
        userId,
        count: 0,
        lastCompletedAt: null,
        badgeExpiresAt: null,
        isActive: false,
      }
    )
  }

  async onSessionCompleted(userId: string): Promise<StreakPublic> {
    const existing = await this.streakRepo.findByUserId(userId)
    const now = new Date()
    const last = existing?.lastCompletedAt ?? null

    let nextCount = 1
    if (last && now.getTime() - last.getTime() <= weekMs) {
      nextCount = now.getTime() - last.getTime() <= dayMs ? existing?.count ?? 1 : (existing?.count ?? 0) + 1
    }

    const badgeExpiresAt = nextCount >= 3 ? new Date(now.getTime() + badgeMs) : null
    return this.streakRepo.upsert(userId, nextCount, now, badgeExpiresAt)
  }
}
