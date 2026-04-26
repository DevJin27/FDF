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

## Architecture Signals In Code

- Repository pattern for DB access
- State machines for intent and room status transitions
- Domain event bus for queue, match, and payment updates
- Socket.IO observer that fans backend events out to subscribed clients

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
