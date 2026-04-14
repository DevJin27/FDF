# FDF - Free Delivery Forever

FDF is a mobile-first group delivery app for neighbours or roommates who want to combine orders, hit a platform minimum, and settle payments cleanly after one host places the order.

The app keeps the group-session flow as the core product: create a delivery room, invite members, add cart items, lock the room, create an order, and track settlement.

## Features

- OTP-based local login with a console OTP provider for development.
- Session creation with platform, delivery minimum, deadline, and shareable code.
- Member join flow with live Server-Sent Events for member/cart/session updates.
- Browseable item catalog through `GET /api/items`, with a fallback catalog for empty databases.
- Group cart with ownership checks for add/remove operations.
- Host checkout through `POST /api/order`, which snapshots cart items into an order.
- Settlement breakdown per member with host-only paid verification.
- Streak tracking after settled sessions.
- Responsive Next.js UI for mobile, tablet, and desktop.

## Tech Stack

| Choice | Why |
| --- | --- |
| Next.js App Router | Gives file-based routing, server/client component boundaries, image optimization, and a clean frontend deployment path. The app uses Next 16 to avoid known older Next.js advisories. |
| Tailwind CSS | Keeps the redesign fast, consistent, and component-friendly without introducing a UI framework dependency. |
| Express API | The repo already had SSE, Prisma services, and auth in a separate API. Keeping Express avoids a risky migration while preserving a clean backend boundary. |
| Prisma + PostgreSQL | Prisma provides typed relational access; PostgreSQL is a strong fit for users, sessions, members, carts, orders, and settlement relationships. |
| Zod | Validates request bodies at the API boundary before data reaches services. |
| Server-Sent Events | A simple fit for one-way live room updates without adding WebSocket infrastructure yet. |

## System Design

```txt
Browser
  |
  | Next.js App Router pages + typed hooks
  v
apps/web
  | REST: auth, items, sessions, cart, order, settlement
  | SSE: /api/sessions/:code/events
  v
apps/api Express
  |
  | controllers/routes -> services -> repositories
  v
Prisma Client
  |
  v
PostgreSQL
```

### Data Flow

```txt
Login -> verify OTP -> dashboard
  -> GET /api/items
  -> POST /api/sessions
  -> share /session/:code
  -> POST /api/sessions/:code/join
  -> POST /api/sessions/:code/cart
  -> SSE broadcasts ITEM_ADDED / ITEM_REMOVED
  -> host POST /api/sessions/:code/lock
  -> host POST /api/order
  -> settlement template calculates member totals
  -> GET /api/sessions/:code/settlement
```

## API Design

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/otp/send` | Generate and console-log a local OTP. |
| `POST` | `/api/auth/otp/verify` | Verify OTP and return a JWT. |
| `GET` | `/api/items?platform=SWIGGY` | Return active catalog items, optionally filtered by platform. |
| `POST` | `/api/sessions` | Create a session and add the leader as the first member. |
| `GET` | `/api/sessions/my` | List sessions hosted by the current user. |
| `GET` | `/api/sessions/joined` | List sessions joined by the current user. |
| `GET` | `/api/sessions/:code` | Load a full session snapshot. |
| `POST` | `/api/sessions/:code/join` | Join an open session. |
| `POST` | `/api/sessions/:code/cart` | Add an item to the current member cart. |
| `DELETE` | `/api/sessions/:code/cart/:id` | Remove an owned cart item. |
| `POST` | `/api/sessions/:code/lock` | Host locks the session. |
| `GET` | `/api/sessions/:code/events` | SSE stream for live room events. |
| `POST` | `/api/order` | Create an order snapshot from a locked session. |
| `GET` | `/api/orders/:id` | Load order details. |
| `GET` | `/api/sessions/:code/settlement` | Load member settlement breakdown. |
| `POST` | `/api/sessions/:code/settlement/:memberId/mark-paid` | Host marks a member paid. |
| `GET` | `/api/users/me/streak` | Load current user streak. |

All API errors are shaped as:

```json
{ "success": false, "error": "Message", "code": "ERROR_CODE" }
```

## Database Schema

Core tables:

- `User`: phone-based identity, display name, optional UPI ID.
- `Session`: delivery room with code, platform, deadline, minimum order, and status.
- `Member`: join table between `User` and `Session`, unique on `(sessionId, userId)`.
- `Item`: platform catalog item with price, image URL, and active flag.
- `CartItem`: current session cart line with item/name/price snapshot.
- `Order`: one order per session with subtotal, status, and paid timestamp.
- `OrderItem`: immutable item snapshot copied from cart at checkout.
- `Settlement`: amount owed per session/member and optional order reference.
- `Streak`: user streak state after completed sessions.

Relationships:

```txt
User 1--many Session (leader)
User many--many Session through Member
Session 1--many CartItem
Session 1--1 Order
Order 1--many OrderItem
Session 1--many Settlement
Member 1--many Settlement
Item 1--many CartItem / OrderItem
User 1--1 Streak
```

Money fields use Prisma `Decimal` in PostgreSQL to avoid floating point drift in cart totals and settlements.

## Folder Structure

```txt
apps/
  web/
    app/                  # App Router pages, loading, error boundaries
    components/
      cart/               # Cart form, rows, summary
      layout/             # AppShell and page sections
      session/            # Session header, member rail, checkout panel
      settlement/         # Settlement rows
      ui/                 # Reusable button/input/status primitives
    hooks/                # Current user, session, SSE, cart hooks
    lib/                  # API client, auth token, formatters, validators
    types/                # API/session contracts
  api/
    prisma/schema.prisma  # PostgreSQL schema
    src/
      app.ts              # Express app composition
      config/             # Singleton env config
      db/                 # Singleton Prisma client
      middleware/         # Auth, validation, error handler
      modules/            # Auth, cart, items, orders, sessions, settlements, streaks
      patterns/           # Explicit pattern implementations
      shared/             # HTTP helpers, money utilities, shared types
```

## Engineering Decisions

- **Why Next.js?** The frontend needs route-level UX, image optimization, strong TypeScript support, and a production deployment path. App Router keeps route composition clear.
- **Why Tailwind?** This app needed a full UI cleanup quickly. Tailwind keeps styling local to components while preserving consistent spacing, typography, and responsive rules.
- **Why keep Express?** The API already had modular service/repository boundaries and SSE. Moving everything into Next route handlers would add migration risk without improving the core product yet.
- **State management choice:** React state and hooks are enough. Zustand would be useful if multiple unrelated screens needed shared client state, but current state is route-local and server-backed.
- **Auth scope:** OTP is still mocked for local development, but it is behind an adapter so a real SMS provider can replace it later.

## System Design Patterns Used

| Pattern | Location | Why it was chosen | Problem solved |
| --- | --- | --- | --- |
| Singleton | `apps/api/src/config/env.ts`, `apps/api/src/db/prisma.ts` | Env and Prisma should be created once per process. | Avoids repeated config parsing and duplicate Prisma clients during hot reload. |
| Factory | `apps/api/src/patterns/session-factory.ts`, `apps/api/src/patterns/order-factory.ts` | Session/order creation needs normalized defaults and immutable snapshots. | Keeps code generation, deadlines, money snapshots, and order item copies out of controllers. |
| Strategy | `apps/api/src/patterns/pricing-strategy.ts` | Platform pricing rules can diverge. | Adds platform-specific pricing without scattering `switch` logic through services. |
| Observer | `apps/api/src/patterns/event-bus.ts` | Session rooms need live updates. | SSE subscribers react to member/cart/lock/settlement events. |
| Adapter | `apps/api/src/patterns/otp-provider-adapter.ts` | OTP delivery should be replaceable. | Local console OTP and future SMS providers share one interface. |
| Template Method | `apps/api/src/patterns/settlement-template.ts` | Settlement has a stable workflow but calculation may change. | Preserves validate -> calculate flow while allowing future settlement formulas. |

Patterns not used were intentionally left out to avoid abstraction that does not help the current product.

## Scalability Considerations

- Use managed PostgreSQL with connection pooling for stateless API instances.
- Keep indexes on session code, member joins, item platform/active, order session, and settlement member/order lookups.
- Move the in-memory OTP store to Redis or another shared TTL store before multi-instance deployment.
- Move the in-process `EventBus` to Redis Pub/Sub, Postgres LISTEN/NOTIFY, or a managed event service before horizontally scaling SSE.
- Cache the item catalog at the API/CDN layer because it is read-heavy and low-change.
- Keep API servers stateless except for the current MVP-only OTP/EventBus pieces.
- Add pagination for dashboard session history before large user accounts.

## Future Improvements

- Real SMS provider through the existing OTP adapter.
- Persistent notification/event service for multi-instance SSE.
- Payment provider integration instead of UPI deep-link hints.
- Admin catalog management for `Item` rows.
- E2E tests with seeded database fixtures.
- Rate limiting for OTP and cart mutation endpoints.
- Role-based access checks for order visibility beyond the current MVP assumptions.

## Setup Instructions

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
# apps/api/.env
DATABASE_URL=postgresql://user:password@host:5432/fdf?sslmode=require
DIRECT_URL=postgresql://user:password@host:5432/fdf?sslmode=require
PORT=4000
JWT_SECRET=replace-with-a-long-local-secret
OTP_EXPIRY_SECONDS=120

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

3. Generate Prisma client:

```bash
npm run db:generate -w api
```

4. Push the schema in local development:

```bash
npm run db:push -w api
```

5. Run the app:

```bash
npm run dev
```

6. Verify quality gates:

```bash
npm run lint -w api
npm run lint -w web
npm run test -w api
npm run build -w api
npm run build -w web
npm audit
```

The API runs on `http://localhost:4000`; the web app runs on `http://localhost:3000` by default.
