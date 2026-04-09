import { and, asc, eq, lt } from "drizzle-orm";

import { createDb, type Database } from "@/db";
import { sessionMembers, sessions, users } from "@/db/schema";
import { getOptionalEnv, getRequiredEnv } from "@/lib/env";
import { AppError } from "@/lib/errors/app-error";
import type { SessionUser } from "@/types";

export const PLATFORM_CONFIG = {
  blinkit: {
    label: "Blinkit",
  },
  swiggy: {
    label: "Swiggy Instamart",
  },
  zepto: {
    label: "Zepto",
  },
} as const;

export type SessionPlatform = keyof typeof PLATFORM_CONFIG;
export type SessionStatus = "open" | "locked" | "settled" | "expired";
export type SessionMemberRole = "leader" | "member";
export type SessionPaymentStatus = "pending" | "paid";

export interface CreateSessionInput {
  platform: SessionPlatform;
  minOrderValue: number;
  deadline: Date;
  deliveryAddress: string;
}

export interface SessionSummary {
  id: string;
  code: string;
  leaderId: string;
  platform: SessionPlatform;
  minOrderValue: number;
  status: SessionStatus;
  deadline: Date;
  deliveryAddress: string;
  totalAmountPaid: number;
  createdAt: Date;
  lockedAt: Date | null;
  settledAt: Date | null;
}

export interface SessionProgress {
  current: number;
  target: number;
  percent: number;
  remaining: number;
}

export interface SessionStateMember {
  user: SessionUser;
  subtotal: number;
  items: Array<{
    name: string;
    price: number;
  }>;
}

export interface SessionState {
  session: SessionSummary;
  members: SessionStateMember[];
  groupTotal: number;
  progress: SessionProgress;
}

interface SessionMemberRecord {
  id: string;
  sessionId: string;
  userId: string;
  role: SessionMemberRole;
  subtotal: number;
  paymentStatus: SessionPaymentStatus;
  joinedAt: Date;
}

interface SessionParticipantRecord extends SessionMemberRecord {
  user: SessionUser;
}

export interface ISessionRepository {
  createSession(
    leaderId: string,
    input: CreateSessionInput & { code: string },
  ): Promise<SessionSummary>;
  findSessionByCode(code: string): Promise<SessionSummary | null>;
  findSessionById(id: string): Promise<SessionSummary | null>;
  findMembership(
    sessionId: string,
    userId: string,
  ): Promise<SessionMemberRecord | null>;
  addMember(
    sessionId: string,
    userId: string,
    role: SessionMemberRole,
  ): Promise<SessionMemberRecord>;
  listSessionParticipants(sessionId: string): Promise<SessionParticipantRecord[]>;
  updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    timestamps?: {
      lockedAt?: Date | null;
      settledAt?: Date | null;
    },
  ): Promise<SessionSummary>;
  findExpiredOpenSessions(now: Date): Promise<SessionSummary[]>;
}

function mapSessionRow(row: typeof sessions.$inferSelect): SessionSummary {
  return {
    id: row.id,
    code: row.code,
    leaderId: row.leader_id,
    platform: row.platform as SessionPlatform,
    minOrderValue: row.min_order_value,
    status: row.status as SessionStatus,
    deadline: row.deadline,
    deliveryAddress: row.delivery_address,
    totalAmountPaid: row.total_amount_paid,
    createdAt: row.created_at,
    lockedAt: row.locked_at ?? null,
    settledAt: row.settled_at ?? null,
  };
}

function mapSessionMemberRow(
  row: typeof sessionMembers.$inferSelect,
): SessionMemberRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    role: row.role as SessionMemberRole,
    subtotal: row.subtotal,
    paymentStatus: row.payment_status as SessionPaymentStatus,
    joinedAt: row.joined_at,
  };
}

export function createDefaultSessionRepository(): ISessionRepository {
  return new SessionRepository(createDb(getRequiredEnv("DATABASE_URL")));
}

export function isSupportedPlatform(platform: string): platform is SessionPlatform {
  return Object.hasOwn(PLATFORM_CONFIG, platform);
}

// PATTERN: State — SessionStateMachine
export class SessionStateMachine {
  private readonly transitions: Record<SessionStatus, ReadonlySet<SessionStatus>> =
    {
      open: new Set<SessionStatus>(["locked", "expired"]),
      locked: new Set<SessionStatus>(["settled"]),
      settled: new Set<SessionStatus>(),
      expired: new Set<SessionStatus>(),
    };

  transition(from: SessionStatus, to: SessionStatus): SessionStatus {
    if (from === to) {
      return to;
    }

    if (!this.transitions[from].has(to)) {
      throw new AppError(
        409,
        `Cannot transition session from ${from} to ${to}`,
        "INVALID_SESSION_TRANSITION",
      );
    }

    return to;
  }

  getEffectiveStatus(session: SessionSummary, now = new Date()): SessionStatus {
    if (session.status === "open" && session.deadline.getTime() <= now.getTime()) {
      return this.transition("open", "expired");
    }

    return session.status;
  }
}

export class SessionRepository implements ISessionRepository {
  constructor(private readonly db: Database) {}

  async createSession(
    leaderId: string,
    input: CreateSessionInput & { code: string },
  ): Promise<SessionSummary> {
    const now = new Date();

    return await this.db.transaction(async (tx) => {
      const [sessionRow] = await tx
        .insert(sessions)
        .values({
          code: input.code,
          leader_id: leaderId,
          platform: input.platform,
          min_order_value: input.minOrderValue,
          status: "open",
          deadline: input.deadline,
          delivery_address: input.deliveryAddress,
          total_amount_paid: 0,
          created_at: now,
        })
        .returning();

      if (!sessionRow) {
        throw new AppError(500, "Unable to create session", "SESSION_CREATE_FAILED");
      }

      await tx.insert(sessionMembers).values({
        session_id: sessionRow.id,
        user_id: leaderId,
        role: "leader",
        subtotal: 0,
        payment_status: "pending",
        joined_at: now,
      });

      return mapSessionRow(sessionRow);
    });
  }

  async findSessionByCode(code: string): Promise<SessionSummary | null> {
    const [row] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.code, code))
      .limit(1);

    return row ? mapSessionRow(row) : null;
  }

  async findSessionById(id: string): Promise<SessionSummary | null> {
    const [row] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    return row ? mapSessionRow(row) : null;
  }

  async findMembership(
    sessionId: string,
    userId: string,
  ): Promise<SessionMemberRecord | null> {
    const [row] = await this.db
      .select()
      .from(sessionMembers)
      .where(
        and(
          eq(sessionMembers.session_id, sessionId),
          eq(sessionMembers.user_id, userId),
        ),
      )
      .limit(1);

    return row ? mapSessionMemberRow(row) : null;
  }

  async addMember(
    sessionId: string,
    userId: string,
    role: SessionMemberRole,
  ): Promise<SessionMemberRecord> {
    const [row] = await this.db
      .insert(sessionMembers)
      .values({
        session_id: sessionId,
        user_id: userId,
        role,
        subtotal: 0,
        payment_status: "pending",
        joined_at: new Date(),
      })
      .returning();

    if (!row) {
      throw new AppError(500, "Unable to join session", "SESSION_JOIN_FAILED");
    }

    return mapSessionMemberRow(row);
  }

  async listSessionParticipants(
    sessionId: string,
  ): Promise<SessionParticipantRecord[]> {
    const rows = await this.db
      .select({
        membership: sessionMembers,
        user: {
          id: users.id,
          phone: users.phone,
          name: users.name,
          upiId: users.upi_id,
        },
      })
      .from(sessionMembers)
      .innerJoin(users, eq(sessionMembers.user_id, users.id))
      .where(eq(sessionMembers.session_id, sessionId))
      .orderBy(asc(sessionMembers.joined_at));

    return rows.map(({ membership, user }) => ({
      ...mapSessionMemberRow(membership),
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        upiId: user.upiId ?? null,
      },
    }));
  }

  async updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    timestamps: {
      lockedAt?: Date | null;
      settledAt?: Date | null;
    } = {},
  ): Promise<SessionSummary> {
    const [row] = await this.db
      .update(sessions)
      .set({
        status,
        locked_at: timestamps.lockedAt,
        settled_at: timestamps.settledAt,
      })
      .where(eq(sessions.id, sessionId))
      .returning();

    if (!row) {
      throw new AppError(404, "Session not found", "SESSION_NOT_FOUND");
    }

    return mapSessionRow(row);
  }

  async findExpiredOpenSessions(now: Date): Promise<SessionSummary[]> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.status, "open"), lt(sessions.deadline, now)));

    return rows.map(mapSessionRow);
  }
}

// PATTERN: Singleton — SessionService
export class SessionService {
  private static instance: SessionService | null = null;

  static getInstance(repository?: ISessionRepository): SessionService {
    if (!SessionService.instance || repository) {
      SessionService.instance = new SessionService(
        repository ?? createDefaultSessionRepository(),
      );
    }

    return SessionService.instance;
  }

  constructor(
    private readonly repository: ISessionRepository,
    private readonly stateMachine = new SessionStateMachine(),
  ) {}

  async createSession(
    leaderId: string,
    input: CreateSessionInput,
  ): Promise<{
    session: SessionSummary;
    shareLink: string;
  }> {
    let session: SessionSummary | null = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = this.generateCode();
      const existing = await this.repository.findSessionByCode(code);

      if (existing) {
        continue;
      }

      session = await this.repository.createSession(leaderId, {
        ...input,
        code,
      });
      break;
    }

    if (!session) {
      throw new AppError(
        500,
        "Unable to generate a unique session code",
        "SESSION_CODE_GENERATION_FAILED",
      );
    }

    return {
      session,
      shareLink: this.generateShareLink(session.code),
    };
  }

  async joinSession(userId: string, code: string): Promise<SessionState> {
    const normalizedCode = code.trim().toUpperCase();
    const session = await this.repository.findSessionByCode(normalizedCode);

    if (!session) {
      throw new AppError(404, "Session not found", "SESSION_NOT_FOUND");
    }

    if (session.leaderId === userId) {
      throw new AppError(
        400,
        "Leader is already part of the session",
        "LEADER_ALREADY_JOINED",
      );
    }

    const effectiveStatus = this.stateMachine.getEffectiveStatus(session);

    if (effectiveStatus === "expired") {
      await this.lockSession(session.id);
      throw new AppError(409, "Session has expired", "SESSION_EXPIRED");
    }

    if (effectiveStatus !== "open") {
      throw new AppError(
        409,
        "Session is no longer accepting members",
        "SESSION_NOT_JOINABLE",
      );
    }

    const existingMembership = await this.repository.findMembership(
      session.id,
      userId,
    );

    if (existingMembership) {
      throw new AppError(409, "You already joined this session", "ALREADY_JOINED");
    }

    await this.repository.addMember(session.id, userId, "member");

    return await this.getSessionState(session.id);
  }

  async getSessionState(sessionId: string): Promise<SessionState> {
    const session = await this.repository.findSessionById(sessionId);

    if (!session) {
      throw new AppError(404, "Session not found", "SESSION_NOT_FOUND");
    }

    const participants = await this.repository.listSessionParticipants(sessionId);
    const groupTotal = participants.reduce((sum, participant) => {
      return sum + participant.subtotal;
    }, 0);
    const progress = this.calculateProgress(groupTotal, session.minOrderValue);

    return {
      session: {
        ...session,
        status: this.stateMachine.getEffectiveStatus(session),
      },
      members: participants.map((participant) => ({
        user: participant.user,
        subtotal: participant.subtotal,
        items: [],
      })),
      groupTotal,
      progress,
    };
  }

  async lockSession(sessionId: string): Promise<SessionState> {
    const session = await this.repository.findSessionById(sessionId);

    if (!session) {
      throw new AppError(404, "Session not found", "SESSION_NOT_FOUND");
    }

    if (session.status === "locked") {
      return await this.getSessionState(sessionId);
    }

    if (session.status !== "open") {
      throw new AppError(
        409,
        "Only open sessions can be locked",
        "INVALID_SESSION_TRANSITION",
      );
    }

    const lockedAt = new Date();
    const nextStatus = this.stateMachine.transition(session.status, "locked");

    await this.repository.updateSessionStatus(sessionId, nextStatus, {
      lockedAt,
      settledAt: session.settledAt,
    });

    return await this.getSessionState(sessionId);
  }

  async getProgress(sessionId: string): Promise<SessionProgress> {
    const state = await this.getSessionState(sessionId);
    return this.calculateProgress(
      state.groupTotal,
      state.session.minOrderValue,
    );
  }

  generateCode(): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const buffer = crypto.getRandomValues(new Uint8Array(4));
    const suffix = Array.from(buffer, (value) => alphabet[value % alphabet.length]).join(
      "",
    );

    return `ORD-${suffix}`;
  }

  generateShareLink(code: string): string {
    const scheme = getOptionalEnv("FDF_DEEPLINK_SCHEME", "fdf") ?? "fdf";
    return `${scheme}://sessions/${encodeURIComponent(code)}`;
  }

  private calculateProgress(current: number, target: number): SessionProgress {
    const remaining = Math.max(target - current, 0);
    const percent = target <= 0 ? 100 : Math.min((current / target) * 100, 100);

    return {
      current,
      target,
      percent: Number(percent.toFixed(2)),
      remaining,
    };
  }
}
