import type { NextFunction, Request, Response } from "express";
import { AppError } from "@fdf/domain";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.code },
    });
    return;
  }

  // Zod or unexpected errors
  if (err instanceof Error) {
    console.error("[API Error]", err.message, err.stack);
  } else {
    console.error("[API Unknown Error]", err);
  }

  res.status(500).json({
    success: false,
    error: { message: "Internal server error", code: "INTERNAL_ERROR" },
  });
}
