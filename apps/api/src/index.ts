import "dotenv/config";

import http from "http";

import cors from "cors";
import express from "express";

import { AuthService } from "./auth/auth-service";
import { getEnv } from "./config/env";
import { SystemClock } from "./lib/clock";
import { AppError } from "./lib/errors";
import { requireAuth } from "./middleware/require-auth";
import { MatchRoomRepository } from "./repositories/match-room-repository";
import { OrderIntentRepository } from "./repositories/order-intent-repository";
import { SettlementRepository } from "./repositories/settlement-repository";
import { UserRepository } from "./repositories/user-repository";
import { createProfileRouter } from "./routes/profile";
import { createIntentRouter } from "./routes/intents";
import { createMatchRouter } from "./routes/matches";
import { createSocketServer } from "./realtime/socket-hub";
import { DomainEventBus } from "./services/domain-event-bus";
import { ExpiryService } from "./services/expiry-service";
import { MatchmakingService } from "./services/matchmaking-service";
import { MatchRoomService } from "./services/match-room-service";
import { OrderIntentService } from "./services/order-intent-service";
import { SettlementService } from "./services/settlement-service";

const env = getEnv();
const clock = new SystemClock();
const eventBus = new DomainEventBus();

const userRepository = new UserRepository();
const orderIntentRepository = new OrderIntentRepository();
const matchRoomRepository = new MatchRoomRepository();
const settlementRepository = new SettlementRepository();
const authService = new AuthService(userRepository);

const matchmakingService = new MatchmakingService(
  orderIntentRepository,
  matchRoomRepository,
  eventBus,
  clock,
  {
    minimumAmount: env.MATCH_MINIMUM_AMOUNT,
    compatibilityWindowMinutes: env.MATCH_WINDOW_MINUTES
  }
);

const orderIntentService = new OrderIntentService(
  orderIntentRepository,
  matchmakingService,
  eventBus,
  clock,
  env.MATCH_MINIMUM_AMOUNT
);
const matchRoomService = new MatchRoomService(
  matchRoomRepository,
  orderIntentRepository,
  eventBus
);
const settlementService = new SettlementService(
  matchRoomRepository,
  settlementRepository,
  eventBus
);
const expiryService = new ExpiryService(
  orderIntentRepository,
  matchRoomRepository,
  orderIntentService,
  eventBus,
  clock
);

const app = express();
const server = http.createServer(app);
const { hub } = createSocketServer(server, authService);
eventBus.subscribe(hub);

app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true
  })
);
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.use(requireAuth(authService));
app.use("/api/intents", createIntentRouter(orderIntentService));
app.use("/api/matches", createMatchRouter(matchRoomService, settlementService));
app.use("/api/profile", createProfileRouter(userRepository));

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(500, "Internal server error", "INTERNAL_ERROR");

  if (!(error instanceof AppError)) {
    console.error(error);
  }

  response.status(appError.status).json({
    error: appError.message,
    code: appError.code
  });
});

setInterval(() => {
  void expiryService.run().catch((error) => {
    console.error("Expiry sweep failed", error);
  });
}, 30_000);

server.listen(env.PORT, () => {
  console.log(`FDF API listening on port ${env.PORT}`);
});
