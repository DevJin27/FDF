# FDF (Free Delivery Forever) - Project Documentation

## 1. Project Overview

**FDF (Free Delivery Forever)** is a group-ordering coordinator designed for college students to aggregate Blinkit orders, bypass minimum order thresholds, and split costs. It functions as a matcher that groups users ordering to the same delivery cluster within a specific time window. 

The application is built as a **monorepo** consisting of:
- **Web**: Next.js 14 frontend application.
- **API**: Express.js backend serving REST endpoints and WebSocket connections.
- **Database**: PostgreSQL (via Neon) managed with Drizzle ORM.

**Core Loop:**
`Create Intent → Live Queue Matching → Match Room Formed & Locked → Host Places Order on Blinkit → Settlement & UPI Payment`

---

## 2. Architecture & Tech Stack

### 2.1 Backend (Express.js)
- **Framework**: Express.js with TypeScript
- **Realtime**: Socket.IO for live queue updates and match room coordination
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: HMAC-SHA256 internal token exchange from NextAuth

### 2.2 Frontend (Next.js)
- **Framework**: Next.js 14 (App Router & Pages Router mixed based on legacy)
- **Styling**: Tailwind CSS
- **State & Realtime**: Socket.IO client, React Hooks
- **Authentication**: NextAuth.js (Google OAuth)

---

## 3. Design Patterns Implemented

The backend is heavily structured around standard software design patterns to maintain modularity and separation of concerns.

### 3.1 Repository Pattern
**Reference:** `apps/api/src/repositories/*`
Abstracts database operations (Drizzle ORM) away from the business logic. 
- **Files**: `order-intent-repository.ts`, `match-room-repository.ts`, `settlement-repository.ts`, `user-repository.ts`
- **Benefit**: Allows the service layer to interact with data objects without worrying about underlying SQL queries.

### 3.2 Service Layer Pattern
**Reference:** `apps/api/src/services/*`
Encapsulates the core business logic and orchestrates operations between repositories and other services.
- **Files**: `order-intent-service.ts`, `match-room-service.ts`, `settlement-service.ts`
- **Benefit**: Keeps controllers (routers) thin and makes business logic highly testable.

### 3.3 Observer Pattern (Event Bus)
**Reference:** `apps/api/src/services/domain-event-bus.ts` & `apps/api/src/realtime/socket-hub.ts`
Used to decouple domain events from side effects (like WebSocket broadcasting).
- **Implementation**: `DomainEventBus` acts as the Subject. `SocketHub` implements `DomainEventSubscriber`.
- **Flow**: Service emits event -> EventBus notifies subscribers -> SocketHub pushes WS message to clients.

### 3.4 State Pattern (State Machines)
**Reference:** `apps/api/src/services/*-state-machine.ts`
Manages valid state transitions for core entities to prevent invalid data states.
- **Files**: `order-intent-state-machine.ts`, `match-room-state-machine.ts`
- **Implementation**: Defines strict allowed transitions (e.g., `open` -> `reserved`, but not `matched` -> `open`).

### 3.5 Strategy Pattern (Matchmaking Algorithm)
**Reference:** `apps/api/src/services/matchmaking-service.ts`
The core matching algorithm `selectBestMatch` implements a strategy to find the optimal combination of order intents.
- **Logic**: Uses a backtracking algorithm to explore subsets, filtering by `minimumAmount` and `compatibilityWindowMinutes`, and sorting by gap and deadline.

### 3.6 Middleware Pattern
**Reference:** `apps/api/src/middleware/require-auth.ts`
Standard Express middleware pattern used to intercept requests, validate Bearer tokens, and inject the `AuthenticatedUser` into the request object.

---

## 4. System Diagrams (Mermaid / Draw.io)

Detailed diagrams have been generated in separate Markdown files using Mermaid syntax. You can copy the raw text from these files and paste them directly into tools like [Draw.io](https://app.diagrams.net/), [Mermaid Live Editor](https://mermaid.live/), or Notion.

### 1. Entity-Relationship (ER) Diagram
**File:** [`docs/er_diagram.md`](./er_diagram.md)
Shows the PostgreSQL database schema including Auth tables (Users, Sessions, Accounts) and App tables (Order Intents, Match Rooms, Members, Settlements).

### 2. Class Diagram
**File:** [`docs/class_diagram.md`](./class_diagram.md)
Maps out the system's TypeScript classes, interfaces, domain types, and demonstrates the relationships and design patterns (Repositories, Services, EventBus).

### 3. Sequence Diagram
**File:** [`docs/sequence_diagram.md`](./sequence_diagram.md)
Illustrates the complete end-to-end user flow: Authentication -> Token Exchange -> WS Connection -> Creating Intent -> Matching -> Locking -> Settlement.

### 4. UML Component & Architecture Diagram
**File:** [`docs/uml_diagram.md`](./uml_diagram.md)
Shows the high-level architecture spanning the Browser Client, Next.js Web App, Express API, and Database, including HTTP REST and WebSocket connections.

---

## 5. Core Entities & Lifecycle

1. **Order Intent**: A user's declaration to buy a certain `amount` of items by a `latestCheckoutAt` deadline for a specific `deliveryCluster`.
    - States: `open` → `reserved` → `matched` (or `cancelled` / `expired`)
2. **Match Room**: Formed when a combination of open intents exceeds the `minimumAmount` (e.g., ₹200). 
    - States: `active` → `locked` (or `expired`)
    - The user with the oldest intent becomes the `leaderUserId`.
3. **Settlement**: Tracks who owes money to the leader.
    - States: `pending` → `paid`
    - The leader can mark members as paid once they receive the UPI transaction.

## 6. Background Jobs
**Reference:** `apps/api/src/index.ts` & `apps/api/src/services/expiry-service.ts`
A `setInterval` runs the `ExpiryService` every 30 seconds to clean up intents and match rooms whose deadlines (`latestCheckoutAt`) have passed in real-time.
