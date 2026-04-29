# FDF (Free Delivery Forever) - Project Documentation

## Project overview
FDF groups compatible user order intents by delivery cluster and checkout deadline. Once the threshold amount is reached, users are moved into a match room, the leader locks the room, and settlement tracking continues until all members are marked paid.

## Current architecture
- **Frontend (`apps/web`)**: Next.js app with NextAuth for login and a route to mint internal API bearer tokens.
- **Backend (`apps/api`)**: Express REST API, Socket.IO realtime hub, domain services, repositories, and periodic expiry sweep.
- **Data layer**: PostgreSQL with Drizzle schema split into auth and app tables.

## Core runtime flow
1. User authenticates via NextAuth.
2. Web app obtains an internal API token from `/api/internal/token`.
3. User creates intent via `/api/intents`.
4. `OrderIntentService` stores intent, publishes queue updates, and runs matchmaking.
5. If a valid set is found, `MatchmakingService` creates room + members + settlements and marks intents `reserved`.
6. Leader locks room via `/api/matches/:id/lock`; member intents become `matched`.
7. Leader marks payments via `/api/matches/:id/payments/:memberId/mark-paid`.
8. `ExpiryService` continuously expires stale intents/rooms and emits realtime updates.

## Rebuilt diagrams (canonical)
- ER diagram: `docs/er_diagram.md`
- Class diagram: `docs/class_diagram.md`
- Sequence diagram: `docs/sequence_diagram.md`
- UML component diagram: `docs/uml_diagram.md`

These diagrams are intentionally aligned to the active `apps/web` and `apps/api` codepaths.
