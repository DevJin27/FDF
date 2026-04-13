import express from "express";
import helmet from "helmet";
import cors from "cors";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createUserRouter } from "./routes/user.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { getContainer } from "./container.js";

export function createApp() {
  const app = express();

  // ── Security & parsing ────────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // ── Health check ──────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Routes ────────────────────────────────────────────────────────────────
  const container = getContainer();
  app.use("/api/auth", createAuthRouter(container));
  app.use("/api/users", createUserRouter(container));

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { message: "Route not found", code: "NOT_FOUND" },
    });
  });

  // ── Error handler (must be last) ──────────────────────────────────────────
  app.use(errorMiddleware);

  return app;
}
