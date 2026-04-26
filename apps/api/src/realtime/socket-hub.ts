import { Server } from "socket.io";

import { AuthService } from "../auth/auth-service";
import { getEnv } from "../config/env";
import { DomainEventMap } from "../lib/domain";
import { DomainEventSubscriber } from "../services/domain-event-bus";

export class SocketHub implements DomainEventSubscriber {
  constructor(
    private readonly io: Server,
    private readonly authService: AuthService
  ) {}

  register() {
    this.io.use(async (socket, next) => {
      try {
        const token =
          typeof socket.handshake.auth.token === "string"
            ? socket.handshake.auth.token
            : null;

        if (!token) {
          throw new Error("Missing auth token");
        }

        const user = await this.authService.authenticateBearerToken(token);
        socket.data.user = user;
        socket.join(`user:${user.id}`);
        next();
      } catch (error) {
        next(error as Error);
      }
    });

    this.io.on("connection", (socket) => {
      socket.on("subscribe.cluster", (cluster: string) => {
        socket.join(`cluster:${cluster}`);
      });

      socket.on("subscribe.match", (roomId: string) => {
        socket.join(`match:${roomId}`);
      });
    });
  }

  async onEvent<K extends keyof DomainEventMap>(name: K, payload: DomainEventMap[K]) {
    if (name === "queue.updated") {
      const queuePayload = payload as DomainEventMap["queue.updated"];
      this.io.to(`cluster:${queuePayload.cluster}`).emit(name, queuePayload);
      return;
    }

    if (name === "match.formed") {
      const matchPayload = payload as DomainEventMap["match.formed"];
      matchPayload.userIds.forEach((userId: string) => {
        this.io.to(`user:${userId}`).emit(name, matchPayload);
      });
      this.io.to(`cluster:${matchPayload.cluster}`).emit(name, matchPayload);
      return;
    }

    if (name === "match.updated" || name === "match.locked" || name === "payment.updated") {
      const roomPayload = payload as
        | DomainEventMap["match.updated"]
        | DomainEventMap["match.locked"]
        | DomainEventMap["payment.updated"];
      this.io.to(`match:${roomPayload.roomId}`).emit(name, roomPayload);
      return;
    }
  }
}

export function createSocketServer(server: Parameters<Server["attach"]>[0], authService: AuthService) {
  const io = new Server(server, {
    cors: {
      origin: getEnv().WEB_ORIGIN,
      credentials: true
    }
  });
  const hub = new SocketHub(io, authService);
  hub.register();

  return {
    io,
    hub
  };
}
