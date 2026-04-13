# FDF v2 — Modern Stack Foundation

The ultimate starter monorepo combining **Next.js 15**, a standalone **Express TS** backend, **Drizzle ORM**, and a premium **Glassmorphism UI** out of the box.

## Architecture

FDF uses an `npm workspaces` monorepo structure:

```
fdf/
├── apps/
│   ├── web/        # Next.js 15 frontend
│   └── api/        # Express 5 standalone backend
└── packages/
    ├── domain/     # Shared biz logic (Zod, Use-Cases, types)
    └── db/         # Drizzle + Neon ORM config
```

### Key Technologies
- **Frontend**: Next.js 15 (App Router), Tailwind CSS v3, Lucide React
- **Backend**: Express 5, DI Container, JWT Session Tokens
- **Database**: Neon (Serverless Postgres), Drizzle ORM
- **Auth**: Passwordless Phone OTP via MSG91

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` in the root and fill out your Neon DB URL and MSG91 credentials.

3. **Database Setup**
   ```bash
   npm run db:generate   # Generates SQL migrations
   npm run db:push       # Pushes schema to Neon
   ```

4. **Development Servers**
   To run both the Next.js frontend and Express backend concurrently:
   ```bash
   npm run dev
   ```

   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:4000`

## Build & CI

To build all packages and apps:
```bash
npm run build
```

To typecheck the entire workspace:
```bash
npm run typecheck
```
