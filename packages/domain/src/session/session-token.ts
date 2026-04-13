import { SignJWT, jwtVerify } from "jose";
import type { SessionUser } from "../types/domain.js";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET env var is required");
  return new TextEncoder().encode(secret);
}

export async function issueSessionToken(
  user: SessionUser,
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
): Promise<string> {
  return new SignJWT({ sub: user.id, phone: user.phone, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.sub !== "string" ||
      typeof payload["phone"] !== "string" ||
      typeof payload["name"] !== "string"
    ) {
      return null;
    }
    return { id: payload.sub, phone: payload["phone"], name: payload["name"] };
  } catch {
    return null;
  }
}

export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7) || null;
}

export { SESSION_MAX_AGE_SECONDS };
