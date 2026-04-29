# FDF v2

Blinkit-first order intent matcher for crossing the `₹200` minimum with the smallest valid group above threshold.

## Apps

- `apps/web`: Next.js App Router frontend, Auth.js Google sign-in, dashboard, queue page, and match room UI
- `apps/api`: Express + Socket.IO backend with Drizzle repositories, matching, room lifecycle, and settlement APIs

## Product Flow

1. User signs in with Google.
2. User creates an order intent with `{ amount, latestCheckoutAt, deliveryCluster }`.
3. Backend scans compatible open intents in the same cluster and within the 15-minute window.
4. When the smallest valid combination reaches `₹200`, a match room is created and users are notified live.
5. The assigned leader locks the room, places the real Blinkit order manually, and the rest pay the leader via UPI.

## Architecture & Design Implementations

This project strictly adheres to SOLID principles and standard Software Design Patterns to ensure maintainability and scalability.

### SOLID Principles
- **[S] Single Responsibility**: Modules have one reason to change. Repositories handle only DB queries (`apps/api/src/repositories/order-intent-repository.ts`), Services handle only business logic (`apps/api/src/services/order-intent-service.ts`), and Routers handle only HTTP transport (`apps/api/src/routes/intents.ts`).
- **[O] Open/Closed**: `DomainEventBus` (`apps/api/src/services/domain-event-bus.ts`) can accept new event subscribers (e.g., push notifications, webhooks) without needing any modification to the bus itself.
- **[L] Liskov Substitution**: `SocketHub` (`apps/api/src/realtime/socket-hub.ts`) safely implements `DomainEventSubscriber`. Any class implementing this interface can be substituted into `eventBus.subscribe()` without breaking functionality.
- **[I] Interface Segregation**: `Clock` (`apps/api/src/lib/clock.ts`) is a minimal interface exposing exactly what is needed (`now()`), rather than a bloated utility contract.
- **[D] Dependency Inversion**: `MatchmakingService` (`apps/api/src/services/matchmaking-service.ts`) depends on the abstract `Clock` interface, not the concrete `SystemClock`, enabling precise time-travel testing. Additionally, all services use Constructor Dependency Injection for their repositories.

### Design Patterns
- **Repository Pattern**: Encapsulates Drizzle ORM data access.
  - *Ref: `apps/api/src/repositories/match-room-repository.ts`*
- **Service Layer Pattern**: Orchestrates application logic and use cases.
  - *Ref: `apps/api/src/services/matchmaking-service.ts`*
- **Observer Pattern (Pub/Sub)**: Decouples domain events from WebSocket side effects.
  - *Ref: Subject: `apps/api/src/services/domain-event-bus.ts` | Subscriber: `apps/api/src/realtime/socket-hub.ts`*
- **State Pattern**: Enforces valid entity state transitions.
  - *Ref: `apps/api/src/services/order-intent-state-machine.ts` and `match-room-state-machine.ts`*
- **Strategy Pattern**: The intent matching heuristic algorithm isolates the complexity of choosing the optimal combination.
  - *Ref: `selectBestMatch` function in `apps/api/src/services/matchmaking-service.ts`*
- **Middleware Pattern**: Intercepts Express routes for unified token validation.
  - *Ref: `apps/api/src/middleware/require-auth.ts`*

## Environment

### `apps/web/.env.local`

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fdf
AUTH_SECRET=replace-me
INTERNAL_API_SECRET=replace-me-with-32-characters
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### `apps/api/.env`

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fdf
INTERNAL_API_SECRET=replace-me-with-32-characters
WEB_ORIGIN=http://localhost:3000
PORT=4000
MATCH_MINIMUM_AMOUNT=200
MATCH_WINDOW_MINUTES=15
```

`DATABASE_URL` and `INTERNAL_API_SECRET` must match across both apps.

## Commands

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

## Verified

- `npm run test`
- `npm run lint`
- `npm run build`
