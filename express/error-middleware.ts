import type { ErrorRequestHandler } from "express";

import { toAppError } from "@/lib/errors/app-error";
import { buildErrorBody } from "@/lib/http/response";

export const globalErrorMiddleware: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  const appError = toAppError(error);

  response.status(appError.statusCode).json(buildErrorBody(appError));
};
