# GroupOrder — Blinkit Group Ordering Coordinator

> Drop this file in the repo root. Every Codex / Antigravity session should read this first for context.

---

## What this app does

Helps college students on the same campus order together from Blinkit.  
We do **not** replace Blinkit. We coordinate the group, aggregate the cart, and split the cost.  
One person (the host) places the final order manually on Blinkit using the exported summary.

**Core loop:**  
`Create group → Share code → Everyone adds items → Cart aggregates → Host locks → Split calculated → Host orders on Blinkit → Everyone pays host via UPI`

---

## Who owns what

| Person   | Module              | Files                                                      |
|----------|---------------------|------------------------------------------------------------|
| Dev      | Backend core + WS   | `apps/api/server/index.js`, `apps/api/server/state.js`, `apps/api/server/socket.js`  |
| Abhiman  | Group service       | `apps/api/server/services/groupService.js`, `apps/api/server/routes/groups.js` |
| Parrv    | Cart engine         | `apps/api/server/services/cartService.js`, `apps/api/server/routes/cart.js` |
| Gargi    | Split engine        | `apps/api/server/services/splitService.js`, `apps/api/server/routes/split.js` |
| Agrima   | Group UI            | `pages/index.jsx`, `pages/group/[id].jsx`, `hooks/useGroup.js` |
| Bhawana  | Cart + Settlement UI| `pages/group/[id]/cart.jsx`, `pages/group/[id]/settle.jsx` |

---

## Repo structure

```
grouporder/
├── apps/api/server/
│   ├── index.js              ← Express app, Socket.IO init, route mounting
│   ├── state.js              ← In-memory store + groups.json persistence
│   ├── socket.js             ← All WebSocket event handlers
│   ├── routes/
│   │   ├── groups.js         ← /api/groups/* (Abhiman)
│   │   ├── cart.js           ← /api/cart/* (Parrv)
│   │   └── split.js          ← /api/split/* (Gargi)
│   └── services/
│       ├── groupService.js   ← Group lifecycle logic (Abhiman)
│       ├── cartService.js    ← Cart + item merge logic (Parrv)
│       └── splitService.js   ← Cost split + UPI links (Gargi)
│
├── hooks/
│   ├── useSocket.js          ← Socket.IO singleton hook (Agrima)
│   └── useGroup.js           ← Group state + WS listener hook (Agrima)
│
├── pages/
│   ├── index.jsx             ← Landing: create / join group (Agrima)
│   └── group/
│       └── [id]/
│           ├── index.jsx     ← Group room: participants, timer, export (Agrima)
│           ├── cart.jsx      ← Cart: add items, live cart view (Bhawana)
│           └── settle.jsx    ← Settlement: split view, UPI pay (Bhawana)
│
├── apps/api/server/groups.json ← Auto-generated. DO NOT edit manually.
├── PLAN.md                   ← This file.
└── .env.local                ← NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Dependency order

```
Dev (server core)
  └── Abhiman (group service)   ← depends on: state.js
  └── Parrv   (cart engine)     ← depends on: state.js, group model
        └── Gargi (split)       ← depends on: cart contributions[] model
  
Agrima  (group UI)              ← depends on: /api/groups, WS events
Bhawana (cart + settle UI)      ← depends on: /api/cart, /api/split, WS events
```

**Build order this week:**  
Day 1 → Dev + Abhiman + Parrv (parallel after server is up)  
Day 2 → Gargi + Agrima (parallel)  
Day 3–4 → Bhawana + integration  
Day 5 → Full flow test + demo polish

---

## Canonical data model

This is the single source of truth. All modules read and write this shape.

```js
// groups.json — top-level object keyed by groupId
{
  "ABC123": {

    // --- Identity ---
    id: "ABC123",               // same as code
    code: "ABC123",              // 6-char alphanumeric, used to join
    name: "Late night snacks",
    address: "Hostel A gate",    // delivery address, set at creation

    // --- Status ---
    status: "open",              // "open" | "locked" | "ordered"
    createdAt: 1700000000000,    // Unix ms
    expiresAt: 1700001200000,    // createdAt + 20 minutes

    // --- People ---
    hostId: "user-uuid",
    participants: [
      {
        id: "user-uuid",
        name: "Priya",
        joinedAt: 1700000000000,
        online: true,
        isHost: true
      }
    ],

    // --- Cart ---
    // Each item tracks per-user contributions so the split engine
    // can calculate who added what. NEVER flatten contributions[].
    cart: [
      {
        id: "item-uuid",
        displayName: "Amul Butter",        // original casing from first adder
        normalizedName: "amul butter",     // lowercase, units stripped
        pricePerUnit: 56,
        contributions: [
          { userId: "user-uuid-1", qty: 2 },
          { userId: "user-uuid-2", qty: 1 }
        ],
        totalQty: 3,
        totalPrice: 168                    // always = totalQty * pricePerUnit
      }
    ],

    deliveryFee: 40,                       // fixed for MVP

    // --- Settlement ---
    settlement: {
      upiId: "priya@upi",                  // host enters after locking
      hostName: "Priya",
      payments: {
        "user-uuid-2": "paid",             // "paid" | "pending"
        "user-uuid-3": "pending"
      }
    }
  }
}
```

---

## API contracts

All endpoints are prefixed `/api`. Server runs on port `4000`.

### Groups — owned by Abhiman

```
POST   /api/groups
  body:    { name, address, hostId, hostName }
  returns: { group }

POST   /api/groups/join
  body:    { code, userId, userName }
  returns: { group }
  errors:  400 "Group not found" | "Group is locked" | "Group is full" | "Already in group"

GET    /api/groups/:id
  returns: { group }

POST   /api/groups/:id/lock
  body:    { userId }           ← must be hostId
  returns: { status: "locked" }

POST   /api/groups/:id/upi
  body:    { upiId, hostName, userId }
  returns: { ok: true }

POST   /api/groups/:id/paid
  body:    { userId }           ← marks this user as paid in settlement
  returns: { ok: true }
```

### Cart — owned by Parrv

```
POST   /api/cart/add
  body:    { groupId, userId, itemName, pricePerUnit, qty }
  returns: { item, merged: bool, cart: Item[] }

POST   /api/cart/remove
  body:    { groupId, userId, itemId }
  returns: { cart: Item[] }

GET    /api/cart/:groupId
  returns: { items: Item[], cartTotal: number }

POST   /api/cart/check-duplicate
  body:    { groupId, itemName }
  returns: { match: Item | null, confidence: "low" | "none" }
```

### Split — owned by Gargi

```
GET    /api/split/:groupId
  returns: {
    participants: [
      {
        userId, userName, isHost,
        itemsTotal, deliveryShare, grandTotal,
        owesTo: userId | null,
        owesAmount: number | null,
        upiLink: string | null
      }
    ],
    cartTotal, deliveryFee, grandTotal,
    hostId, hostName
  }

GET    /api/split/:groupId/summary
  returns: {
    breakdown: [{ name, owes, upiLink }],
    hostCollects: number
  }
```

---

## WebSocket events

Server runs Socket.IO on the same port as Express (4000).

### Client → server

```
join_room     { groupId, userId }      ← on entering any group page
leave_room    { groupId, userId }      ← on page unload / unmount
heartbeat     { groupId, userId }      ← every 15s to mark online: true
```

### Server → room (all clients in that groupId)

```
user_joined       { participant }
user_left         { userId }
cart_updated      { cart: Item[], cartTotal: number }
host_changed      { newHostId, newHostName }
session_warning   { minutesLeft: 5 }     ← fires at T-5min
session_expired   {}                     ← fires at T-0, group auto-locks
group_locked      { finalCart: Item[] }
```

---

## Item normalization rules (Parrv's cartService)

Parrv owns this logic. Everyone else trusts it.

- Lowercase + trim
- Collapse multiple spaces → single space
- Strip chars that are not letters, numbers, or spaces
- Strip unit words: `gm g ml l kg pack pcs pc litre ltr`
- Fuzzy match threshold: Levenshtein ≤ 2 → same item (merge)
- Levenshtein 3–5 → ambiguous (ask user via `/check-duplicate`)
- Levenshtein > 5 → different item (add separately)

---

## Split calculation rules (Gargi's splitService)

Gargi owns this logic. UI trusts the API output directly.

- Each user's item cost = sum of `(contribution.qty * item.pricePerUnit)` across all items
- Delivery fee split **equally** across all participants (not proportional)
- Rounding: use `Math.floor` per user, remainder goes to host
- UPI link format: `upi://pay?pa={upiId}&pn={hostName}&am={amount}&cu=INR&tn=Group Blinkit order`
- If `upiId` is empty string → `upiLink = null`

---

## Session lifecycle rules (Dev's socket.js)

- Group TTL: 20 minutes from `createdAt`
- At T-5min: emit `session_warning` to room
- At T-0: set `status = "locked"`, emit `session_expired` + `group_locked`
- Heartbeat: if no heartbeat from a userId for > 30s → `online: false`
- Host disconnects: promote next participant where `online: true`
  - Order by `joinedAt` ascending → pick first non-host online participant
  - If no one online → lock group immediately

---

## Environment variables

```
# .env.local (frontend)
NEXT_PUBLIC_API_URL=http://localhost:4000

# server uses PORT env var (default 4000)
```

---

## WhatsApp export format

The host uses this to share the order with the group and place it on Blinkit.  
Both Agrima (group room) and Bhawana (settle page) generate this. Keep the format identical.

```
🛒 Group Order — [Group Name]
📍 Deliver to: [address]

• [Item name] x[qty] — ₹[total]
• [Item name] x[qty] — ₹[total]
...

🛵 Delivery: ₹40
💰 Total: ₹[grandTotal]

💸 Pay your share:
  [Name]: ₹[amount] → [upiId]
  [Name]: ₹[amount] → [upiId]
```

---

## Key constraints

- No Blinkit API. Host places the order manually.
- No authentication. `userId` is a UUID generated client-side and stored in `localStorage`.
- No database. All state is in-memory, backed by `apps/api/server/groups.json` on disk.
- Max 10 users per group.
- Same college = same Blinkit delivery zone. Availability is not a concern.
- Frontend: Next.js + Tailwind. No external UI component libraries.
- All amounts in Indian Rupees (₹). Format with `toLocaleString('en-IN')`.
