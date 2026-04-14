import { SessionStatus } from '@prisma/client'
import { eventBus } from '../../patterns/event-bus'
import { AppError } from '../../shared/http'
import { CreateSessionDto, SessionPublic } from '../../shared/types'
import { streakService } from '../streaks/streak.routes'
import { SessionRepository } from './session.repository'

export class SessionService {
  constructor(private readonly repo: SessionRepository) {}

  async createSession(dto: CreateSessionDto): Promise<SessionPublic> {
    const session = await this.repo.create(dto)
    this.startTickLoop(session.id, session.deadline)
    return session
  }

  async getSession(code: string): Promise<SessionPublic> {
    const session = await this.repo.findByCode(code)
    if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND')
    return session
  }

  async getSessionsByLeader(leaderId: string): Promise<SessionPublic[]> {
    return this.repo.findByLeaderId(leaderId)
  }

  async getSessionsByMember(userId: string): Promise<SessionPublic[]> {
    return this.repo.findByMemberUserId(userId)
  }

  async joinSession(code: string, userId: string): Promise<SessionPublic> {
    const session = await this.getSession(code)
    if (session.status !== 'OPEN') throw new AppError('Session is not open', 409, 'SESSION_CLOSED')

    await this.repo.addMember(session.id, userId)
    const updated = await this.getSession(code)
    eventBus.emit(session.id, 'MEMBER_JOINED', { sessionId: session.id, members: updated.members })
    return updated
  }

  async lockSession(code: string, requesterId: string): Promise<SessionPublic> {
    const session = await this.getSession(code)
    if (session.leaderId !== requesterId) throw new AppError('Only the leader can lock', 403, 'FORBIDDEN')
    if (session.status !== 'OPEN') throw new AppError('Session is already locked or settled', 409, 'SESSION_CLOSED')

    await this.repo.updateStatus(session.id, SessionStatus.LOCKED)
    eventBus.emit(session.id, 'SESSION_LOCKED', { sessionId: session.id })
    return this.getSession(code)
  }

  async checkoutSession(code: string, requesterId: string): Promise<SessionPublic> {
    const session = await this.getSession(code)
    if (session.leaderId !== requesterId) throw new AppError('Only the leader can checkout', 403, 'FORBIDDEN')
    if (session.status !== 'LOCKED') throw new AppError('Session must be locked before checkout', 409, 'SESSION_NOT_LOCKED')

    await this.repo.updateStatus(session.id, SessionStatus.SETTLED)

    const userIds = new Set([session.leaderId, ...session.members.map((member) => member.userId)])
    Promise.all([...userIds].map((userId) => streakService.onSessionCompleted(userId))).catch((err) => {
      console.error('Error updating streaks:', err)
    })

    const updated = await this.getSession(code)
    eventBus.emit(session.id, 'SETTLEMENT_UPDATED', { sessionId: session.id })
    return updated
  }

  private startTickLoop(sessionId: string, deadline: Date): void {
    const interval = setInterval(() => {
      const secondsLeft = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000))
      eventBus.emit(sessionId, 'TICK', { secondsLeft })

      if (secondsLeft <= 0) {
        clearInterval(interval)
        this.repo.findById(sessionId).then(async (session) => {
          if (session?.status === 'OPEN') {
            await this.repo.updateStatus(sessionId, SessionStatus.LOCKED)
            eventBus.emit(sessionId, 'SESSION_LOCKED', { sessionId })
          }
        })
      }
    }, 1000)
  }
}
