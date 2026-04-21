# FDF v1 — What We Built & What We Got Wrong

## What We Were Trying to Build

**Free Delivery Forever (FDF)** — a group-order clubbing app for neighbours/flatmates.  
The core loop was simple:

1. One person (the host) creates a "delivery session" targeting a platform (e.g. Blinkit, Swiggy).
2. Others join via a shareable code.
3. Each member adds items to a shared cart.
4. When the cart crosses the free-delivery minimum, the host checks out.
5. The app tracks who owes what and marks members as settled.

---

## What We Actually Built

A working **monorepo** (npm workspaces):

| App | Tech |
|-----|------|
| `apps/api` | Express + Prisma + PostgreSQL (Neon DB) + JWT auth + SSE |
| `apps/web` | Next.js 14 App Router + Tailwind CSS |

### API Endpoints Implemented

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/otp/send` | Send OTP (console-logged, not real SMS) |
| POST | `/api/auth/otp/verify` | Verify OTP → return JWT |
| GET | `/api/items` | Browse catalog items (with platform filter) |
| POST | `/api/sessions` | Create a delivery session |
| GET | `/api/sessions/my` | Sessions hosted by logged-in user |
| GET | `/api/sessions/joined` | Sessions joined by logged-in user |
| GET | `/api/sessions/:code` | Full session snapshot |
| POST | `/api/sessions/:code/join` | Join a session |
| POST | `/api/sessions/:code/cart` | Add item to cart |
| DELETE | `/api/sessions/:code/cart/:id` | Remove owned cart item |
| POST | `/api/sessions/:code/lock` | Host locks session |
| GET | `/api/sessions/:code/events` | SSE stream for live updates |
| POST | `/api/order` | Create order snapshot from locked session |
| GET | `/api/orders/:id` | Load order details |
| GET | `/api/sessions/:code/settlement` | Settlement breakdown per member |
| POST | `/api/sessions/:code/settlement/:memberId/mark-paid` | Host marks member paid |
| GET | `/api/users/me/streak` | User streak data |

### Design Patterns Declared in Code

| Pattern | File | Stated Reason |
|---------|------|---------------|
| Singleton | `config/env.ts`, `db/prisma.ts` | One env parse / one Prisma client |
| Factory | `patterns/session-factory.ts`, `patterns/order-factory.ts` | Normalize session/order creation |
| Strategy | `patterns/pricing-strategy.ts` | Per-platform pricing rules |
| Observer | `patterns/event-bus.ts` | SSE room event broadcasting |
| Adapter | `patterns/otp-provider-adapter.ts` | Swappable OTP provider |
| Template Method | `patterns/settlement-template.ts` | stable validate→calculate flow |

---

## The Mistakes — Honest Audit

### ❌ Mistake 1: Design Patterns for the Sake of It (The Big One)

This is the single biggest architectural mistake of the whole project.

Every pattern was **declared**, given a dedicated file in `src/patterns/`, and documented in the README.  
But look at what actually happened when you trace the call paths:

- **Factory** — `session-factory.ts` had ~15 lines that just called `prisma.session.create`. The same logic would have been 3 lines inside the service. Nothing used it polymorphically.
- **Strategy** — `pricing-strategy.ts` had two classes (`BlinkitPricing`, `SwiggyPricing`) that both returned `item.price`. There was no divergence in actual pricing logic. The `switch` this replaced was simpler than the abstraction.
- **Observer / EventBus** — `event-bus.ts` was an in-memory pub/sub wrapper over a `Map`. The SSE module called `eventBus.emit(...)` and the SSE handler called `eventBus.on(...)`. This is fine in principle but it was over-engineered for one broadcaster talking to one listener type. A single `sseEmitter` function would have been 5 lines.
- **Adapter** — `otp-provider-adapter.ts` defined an `OtpProvider` interface with `ConsoleOtpProvider` implementing it. There was only ever **one** provider: the console logger. The interface added zero value at this stage. A function `sendOtp(phone, code)` with a `console.log` would have been identical in practice.
- **Template Method** — `settlement-template.ts` defined an abstract class with a `validate()` hook and a `calculate()` hook. It was never subclassed; there was only one concrete class. This is the definition of premature abstraction.
- **Singleton** — this one was actually fine and necessary (`prisma.ts`, `env.ts`). The pattern matched the actual need.

**The lesson:** A pattern only earns its complexity when you have *at least two concrete variants that differ*. If you never have a second Strategy subclass, you didn't need the Strategy pattern — you just needed a function.

---

### ❌ Mistake 2: Auth Was Fake

OTP was "sent" by printing to the server console:

```ts
// ConsoleOtpProvider
async send(phone: string, code: string) {
  console.log(`[OTP] ${phone}: ${code}`)
}
```

This means:
- Users can't actually log in on any device that isn't the developer's terminal.
- There's no real identity verification.
- The JWT issued after "verification" was real and signed — but the underlying identity is worthless.

For a **next version**, auth needs to actually work. The canonical integration is **Twilio Verify** or a similar SMS API. The phone number becomes the verified identity anchor.

---

### ❌ Mistake 3: Platform-Agnostic When It Should Be Blinkit-First

The app was built to support `platform: SWIGGY | BLINKIT | ZEPTO` etc. from day one.  
In practice:
- The item catalog was generic across platforms.
- Pricing strategy had per-platform classes that did the same thing.
- Auth had no concept of "which platform this session is on."

The real product insight is that **Blinkit's 10-minute delivery window** is the constraint that makes group ordering interesting. Swiggy and Zepto operate differently. Building multi-platform from the start added complexity that diluted the core idea.

**Next version:** Build exclusively for Blinkit. One platform. One pricing model. No `platform` enum in the schema. Remove the abstraction that never diverged.

---

### ❌ Mistake 4: No Real Tests

The test directory existed. It was essentially empty or had one placeholder test. The quality gate `npm run test -w api` would pass vacuously. A project with 17 API endpoints and financial calculations (settlement) should have at minimum:
- Unit tests for settlement math.
- Integration tests for the session state machine (open → locked → ordered).

---

### ❌ Mistake 5: SSE Scalability Debt Ignored as "Future Work"

The `EventBus` was in-process memory. This means:
- Two API instances = broken SSE (events only reach subscribers on the same process).
- The README mentioned Redis Pub/Sub as a future fix.

This is fine for a local demo but the architecture should have been designed with this constraint explicit upfront, not treated as a footnote.

---

## What's Different in v2

| Concern | v1 | v2 |
|---------|----|----|
| Design patterns | Added upfront for all predicted needs | Added only when a second variant actually exists |
| Auth | Console OTP, fake identity | Real SMS OTP (Twilio Verify or equivalent) |
| Platform scope | BLINKIT + SWIGGY + ZEPTO + generic | **Blinkit only** |
| Tests | Empty test suite | Settlement math + session state machine covered |
| Patterns justification | "We might need it" | "We have two concrete cases right now" |

---

## The Single Rule for v2

> **A design pattern is a solution to a recurring problem. If the problem hasn't recurred yet, the pattern is just overhead.**

Write the simplest code that works.  
Introduce the abstraction the moment you have the second concrete case that justifies it.  
Not before.
