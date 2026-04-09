import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors/app-error";
import { buildErrorBody } from "@/lib/http/response";
import { extractSessionToken, verifySessionToken } from "@/lib/session-token";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = extractSessionToken(request.headers);

  if (!token) {
    return NextResponse.json(
      buildErrorBody(
        new AppError(401, "Authentication required", "UNAUTHORIZED"),
      ),
      { status: 401 },
    );
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return NextResponse.json(
      buildErrorBody(
        new AppError(401, "Invalid or expired session", "INVALID_SESSION"),
      ),
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/sessions/:path*", "/api/cart/:path*"],
};
