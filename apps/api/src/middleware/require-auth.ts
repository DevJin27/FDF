import { NextFunction, Request, Response } from "express";

import { AuthService } from "../auth/auth-service";
import { AppError } from "../lib/errors";
import { AuthenticatedUser } from "../lib/domain";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export function requireAuth(authService: AuthService) {
  return async function authMiddleware(
    request: Request,
    _response: Response,
    next: NextFunction
  ) {
    try {
      const authorization = request.headers.authorization;

      if (!authorization?.startsWith("Bearer ")) {
        throw new AppError(401, "Missing bearer token", "UNAUTHORIZED");
      }

      const token = authorization.slice("Bearer ".length);
      request.user = await authService.authenticateBearerToken(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}
