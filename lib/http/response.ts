import { NextResponse } from "next/server";

import { toAppError } from "@/lib/errors/app-error";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  AppUser,
  PublicUserProfile,
  SessionUser,
} from "@/types";

export function buildSuccessBody<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

export function buildErrorBody(error: unknown): ApiErrorResponse {
  const appError = toAppError(error);

  return {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined ? { details: appError.details } : {}),
    },
  };
}

export function jsonSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(buildSuccessBody(data), { status });
}

export function jsonSuccessEnvelope(status = 200): NextResponse {
  return NextResponse.json({ success: true }, { status });
}

export function jsonError(error: unknown): NextResponse {
  const appError = toAppError(error);
  return NextResponse.json(buildErrorBody(appError), {
    status: appError.statusCode,
  });
}

export async function withErrorHandling(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return jsonError(error);
  }
}

export function toPublicUserProfile(user: AppUser): PublicUserProfile {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    upiId: user.upiId,
    fdfStreak: user.fdfStreak,
    fdfUnlockedUntil: user.fdfUnlockedUntil?.toISOString() ?? null,
  };
}

export function toSessionPayload(
  user: Pick<AppUser, "id" | "phone" | "name" | "upiId">,
): SessionUser {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    upiId: user.upiId,
  };
}
