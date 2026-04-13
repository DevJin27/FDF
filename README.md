# FDF v2 — Enterprise Foundation & Architecture
> A modern web application demonstrating clean architecture, strict typing, and scalable design patterns.

## 📖 Project Overview
FDF is a full-stack, enterprise-grade boilerplate application refactored from a monolithic Next.js structure into a strictly decoupled **npm workspaces monorepo**. The application implements robust phone-based OTP authentication, stateless session management, and a dynamic Next.js App Router frontend seamlessly communicating with a standalone Express.js backend.

This project was built with a strong emphasis on **Clean Architecture** and **Software Design Patterns**, making the codebase highly maintainable, testable, and theoretically sound.

---

## 🏗 System Architecture (Monorepo)

The repository is modularized into independent packages to enforce a strict separation of concerns:

```
fdf/
├── apps/
│   ├── web/        # Frontend: Next.js 15 App Router + Tailwind CSS + Glassmorphism UI
│   └── api/        # Backend: Express 5 + REST APIs + Security Middleware
└── packages/
    ├── domain/     # Core Business Rules: Use-Cases, Services, Providers, JWT Logic
    └── db/         # Persistence Layer: Drizzle ORM + Neon PostgreSQL Schemas
```

### 💻 Technology Stack
- **Frontend (apps/web)**: Next.js 15, React 19, Tailwind CSS v3, Tailwind-Merge, Lucide-React.
- **Backend (apps/api)**: Express 5, CORS, Helmet.
- **Data (packages/db)**: Drizzle ORM, Neon DB (Serverless Postgres).
- **Core Domain (packages/domain)**: Zod (Validation), Jose (JWT parsing), Web Crypto API.

---

## 🏛 Software Design Patterns Implemented

This project extensively employs classical Gang of Four (GoF) and architectural design patterns. These ensure the system can adapt to changes (e.g., swapping databases or SMS providers) without breaking core functionality.

### 1. Dependency Injection (DI) Pattern
**Application**: `apps/api/src/container.ts`  
We utilize a DI Container to instantiate and hold references to our Database, Stores, and Services. Instead of routes instantiating their own database connections or hardcoding `import { db }`, the container injects these dependencies directly into the route factories.
* **Why it matters for Viva**: It drastically lowers coupling. During testing, we can inject a mock `SMSProvider` or an in-memory SQL database into the container without modifying the actual route handler logic.

### 2. Repository Pattern
**Application**: `packages/domain/src/repositories/` (`user.repository.ts`, `otp-code.repository.ts`)  
All raw SQL/Drizzle queries are hidden behind domain interfaces (`IUserRepository`, `IOTPStore`). The service layer only knows how to call methods like `findByPhone()` or `markConsumed()`. 
* **Why it matters for Viva**: The core business logic is completely insulated from the database technology. If we migrate from PostgreSQL to MongoDB, we simply write a `MongoUserRepository` that implements `IUserRepository`. The rest of the application remains untouched.

### 3. Strategy / Adapter Pattern
**Application**: `packages/domain/src/providers/msg91-sms.provider.ts`  
We communicate with a 3rd-party vendor (MSG91) to send text messages. Instead of tightly coupling their specific API requirements to our code, we created an adapter that conforms to our generic `ISMSProvider` interface.
* **Why it matters for Viva**: It dictates *how* the system communicates with external services. If we need to abandon MSG91 for Twilio, we just write a new Adapter strategy. The core `OTPService` will blindly use it, unaware of the vendor change.

### 4. Facade / Use-Case Pattern
**Application**: `packages/domain/src/use-cases/auth.ts`  
Instead of placing 100 lines of complex registration, hashing, validation, and database updates into an Express route controller, we wrap these multi-step operations into singular Use-Case functions like `authenticatePhoneOtp()`.
* **Why it matters for Viva**: The Use-Case acts as a Facade that coordinates the `OTPService`, `UserRepository`, and Zod validators. This keeps the Express delivery layer extremely thin (only responsible for HTTP request/response handling).

### 5. Factory Pattern
**Application**: `apps/api/src/app.ts` (`createApp`), `packages/db/src/client.ts` (`createDb`)  
We avoided configuring the server or database as singletons that execute immediately on file load. Instead, we use Factory functions to conditionally generate configurations, database connections, and Express apps.
* **Why it matters for Viva**: Factories allow the system to spin up multiple instances simultaneously, avoiding global state pollution. It ensures safe encapsulation of environment variables during the instantiation phase.

### 6. Chain of Responsibility (Middleware) Pattern
**Application**: `apps/api/src/middleware/` (`auth.middleware.ts`, `error.middleware.ts`)  
Express routing natively utilizes this pattern. Requests pass through a chain of handlers. 
* **Why it matters for Viva**: The `requireAuth` middleware catches a request, verifies the JWT, and attaches the payload to `req.sessionUser` before passing it down the chain. The `errorMiddleware` sits at the end of the chain, universally trapping mapped Domain `AppError` exceptions and translating them into standard REST HTTP responses, preventing app crashes.

---

## 🔐 Core Workflows

### Passwordless Authentication (OTP + JWT)
1. **Send OTP**: User provides a phone number on the Next.js frontend. The API validates it (Zod), hashes a generated 6-digit OTP (Web Crypto), saves it via `OTPCodeRepository`, and sends it via the `MSG91SMSProvider`.
2. **Verify OTP**: User inputs the code. The system pulls the hash, verifies timestamps for expiration, and confirms it hasn't been consumed.
3. **Session Genesis**: Upon validation, if the user doesn't exist, they are auto-created. The backend creates a digitally signed JSON Web Token (JWT) using `jose` (`HS256`) and returns it to the client for stateless Authorization headers.

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v20.0.0` or higher.
- A Neon Serverless Postgres URL.
- MSG91 API configuration.

### Setup Instructions
1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` in the origin folder and populate the credentials.

3. **Database Migrations:**
   Generate schema definitions and migrate to your database:
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Launch Application:**
   Start the frontend and backend concurrently via workspaces:
   ```bash
   npm run dev
   ```
   - Web App loads at `http://localhost:3000`
   - Express App loads at `http://localhost:4000`
