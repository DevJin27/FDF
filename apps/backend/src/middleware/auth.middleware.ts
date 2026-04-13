import type { NextFunction, Request, Response } from "express";
import {
  AppError,
  extractBearerToken,
  verifySessionToken,
} from "@fdf/domain";
import type { SessionUser } from "@fdf/domain";

// Extend Express Request with session user
declare global {
  namespace Express {
    interface Request {
      sessionUser?: SessionUser;
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return next(new AppError(401, "Authentication required", "UNAUTHORIZED"));
  }

  const user = await verifySessionToken(token);
  if (!user) {
    return next(new AppError(401, "Invalid or expired token", "INVALID_SESSION"));
  }

  req.sessionUser = user;
  next();
}
