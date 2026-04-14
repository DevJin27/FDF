import { PrismaClient, SessionStatus } from '@prisma/client'
import { SessionFactory } from '../../patterns/session-factory'
import { AppError } from '../../shared/http'
import { CreateSessionDto, SESSION_INCLUDE, serializeSession, SessionPublic } from '../../shared/types'

export class SessionRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByCode(code: string): Promise<SessionPublic | null> {
    const session = await this.db.session.findUnique({ where: { code }, include: SESSION_INCLUDE })
    return session ? serializeSession(session) : null
  }

  async findById(id: string): Promise<SessionPublic | null> {
    const session = await this.db.session.findUnique({ where: { id }, include: SESSION_INCLUDE })
    return session ? serializeSession(session) : null
  }

  async findByLeaderId(leaderId: string): Promise<SessionPublic[]> {
    const sessions = await this.db.session.findMany({
      where: { leaderId },
      include: SESSION_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return sessions.map(serializeSession)
  }

  async findByMemberUserId(userId: string): Promise<SessionPublic[]> {
    const sessions = await this.db.session.findMany({
      where: { members: { some: { userId } } },
      include: SESSION_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return sessions.map(serializeSession)
  }

  async create(dto: CreateSessionDto): Promise<SessionPublic> {
    const leader = await this.db.user.findUnique({
      where: { id: dto.leaderId },
      select: { id: true },
    })

    if (!leader) {
      throw new AppError('Invalid or expired session', 401, 'INVALID_SESSION')
    }

    const blueprint = SessionFactory.create(dto)
    const session = await this.db.session.create({
      data: {
        ...blueprint,
        members: { create: { userId: dto.leaderId } },
      },
      include: SESSION_INCLUDE,
    })
    return serializeSession(session)
  }

  async updateStatus(id: string, status: SessionStatus): Promise<void> {
    await this.db.session.update({ where: { id }, data: { status } })
  }

  async addMember(sessionId: string, userId: string): Promise<void> {
    await this.db.member.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: {},
      create: { sessionId, userId },
    })
  }

  async findMemberById(memberId: string) {
    return this.db.member.findUnique({ where: { id: memberId } })
  }

  async findMember(sessionId: string, userId: string) {
    return this.db.member.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
      include: { cartItems: true, user: true, settlements: true },
    })
  }
}
