import cron, { type ScheduledTask } from "node-cron";

import { AppError } from "@/lib/errors/app-error";
import {
  createDefaultSessionRepository,
  type ISessionRepository,
  type SessionState,
  SessionService,
} from "@/lib/session-service";

export interface ITimerJob {
  start(): void;
  stop(): void;
  run(): Promise<void>;
}

export interface SessionLockEvent {
  type: "session.locked";
  sessionId: string;
  code: string;
  occurredAt: string;
  sse: string;
}

export interface SessionStateObserver {
  onSessionLocked(event: SessionLockEvent): void | Promise<void>;
}

// PATTERN: Observer — TimerService notifies on state change
export class TimerService implements ITimerJob {
  private task: ScheduledTask | null = null;
  private readonly observers = new Set<SessionStateObserver>();

  constructor(
    private readonly repository: Pick<ISessionRepository, "findExpiredOpenSessions"> =
      createDefaultSessionRepository(),
    private readonly sessionService: Pick<SessionService, "lockSession"> =
      SessionService.getInstance(),
  ) {}

  subscribe(observer: SessionStateObserver): () => void {
    this.observers.add(observer);

    return () => {
      this.observers.delete(observer);
    };
  }

  start(): void {
    if (this.task) {
      return;
    }

    this.task = cron.schedule("*/10 * * * * *", () => {
      void this.run().catch((error: unknown) => {
        console.error("TimerService run failed", error);
      });
    });
  }

  stop(): void {
    this.task?.stop();
    this.task?.destroy();
    this.task = null;
  }

  async run(): Promise<void> {
    const now = new Date();
    const expiredSessions = await this.repository.findExpiredOpenSessions(now);

    for (const session of expiredSessions) {
      try {
        const lockedState = await this.sessionService.lockSession(session.id);
        const occurredAt = new Date();
        const event = this.buildLockEvent(lockedState, occurredAt);

        await this.notify(event);
        console.log(`Locked session ${session.id} at ${event.occurredAt}`);
      } catch (error) {
        if (
          error instanceof AppError &&
          error.code === "INVALID_SESSION_TRANSITION"
        ) {
          continue;
        }

        throw error;
      }
    }
  }

  private buildLockEvent(
    lockedState: SessionState,
    occurredAt: Date,
  ): SessionLockEvent {
    const payload = {
      sessionId: lockedState.session.id,
      code: lockedState.session.code,
      status: lockedState.session.status,
      lockedAt: occurredAt.toISOString(),
    };

    return {
      type: "session.locked",
      sessionId: lockedState.session.id,
      code: lockedState.session.code,
      occurredAt: occurredAt.toISOString(),
      sse: `event: session.locked\ndata: ${JSON.stringify(payload)}\n\n`,
    };
  }

  private async notify(event: SessionLockEvent): Promise<void> {
    for (const observer of this.observers) {
      await observer.onSessionLocked(event);
    }
  }
}
