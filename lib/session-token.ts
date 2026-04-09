import { getRequiredEnv } from "@/lib/env";
import { AppError } from "@/lib/errors/app-error";
import type { AppUser, SessionTokenPayload, SessionUser } from "@/types";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type HeaderBag =
  | Headers
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

function getSessionSecret(): Uint8Array {
  return new TextEncoder().encode(getRequiredEnv("NEXTAUTH_SECRET"));
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

async function createSigningKey(): Promise<CryptoKey> {
  const secret = getSessionSecret();
  const keyBytes = new Uint8Array(secret.byteLength);

  keyBytes.set(secret);

  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"],
  );
}

async function signToken(unsignedToken: string): Promise<string> {
  const key = await createSigningKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(unsignedToken),
  );

  let binary = "";

  for (const byte of new Uint8Array(signature)) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function verifySignature(
  unsignedToken: string,
  signature: string,
): Promise<boolean> {
  const key = await createSigningKey();
  const base64 = signature.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return await crypto.subtle.verify(
    "HMAC",
    key,
    bytes,
    new TextEncoder().encode(unsignedToken),
  );
}

function usesSecureCookies(): boolean {
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  return process.env.NODE_ENV === "production" || Boolean(nextAuthUrl?.startsWith("https://"));
}

function readHeader(headers: HeaderBag, name: string): string | null {
  if ("get" in headers && typeof headers.get === "function") {
    return headers.get(name);
  }

  const record = headers as Record<string, string | string[] | undefined>;
  const value = record[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function readCookie(cookieHeader: string, name: string): string | null {
  const targetPrefix = `${name}=`;

  for (const segment of cookieHeader.split(";")) {
    const trimmed = segment.trim();

    if (trimmed.startsWith(targetPrefix)) {
      return decodeURIComponent(trimmed.slice(targetPrefix.length));
    }
  }

  return null;
}

export function getSessionCookieName(): string {
  return usesSecureCookies()
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
}

export function getSessionCookieConfig() {
  return {
    name: getSessionCookieName(),
    options: {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax" as const,
      secure: usesSecureCookies(),
    },
  };
}

export function toSessionUser(user: Pick<AppUser, "id" | "phone" | "name" | "upiId">): SessionUser {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    upiId: user.upiId,
  };
}

export async function issueSessionToken(
  user: SessionUser,
  maxAge = SESSION_MAX_AGE_SECONDS,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: SessionTokenPayload = {
    sub: user.id,
    id: user.id,
    phone: user.phone,
    name: user.name,
    upiId: user.upiId,
    iat: issuedAt,
    exp: issuedAt + maxAge,
  };
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = await signToken(unsignedToken);

  return `${unsignedToken}.${signature}`;
}

export async function verifySessionToken(
  token: string,
): Promise<SessionTokenPayload | null> {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    if (!encodedHeader || !encodedPayload || !signature) {
      return null;
    }

    const isSignatureValid = await verifySignature(
      `${encodedHeader}.${encodedPayload}`,
      signature,
    );

    if (!isSignatureValid) {
      return null;
    }

    const header = JSON.parse(decodeBase64Url(encodedHeader)) as {
      alg?: string;
      typ?: string;
    };

    if (header.alg !== "HS256" || header.typ !== "JWT") {
      return null;
    }

    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as Record<
      string,
      unknown
    >;

    if (
      typeof payload.sub !== "string" ||
      typeof payload.phone !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }

    const issuedAt = typeof payload.iat === "number" ? payload.iat : undefined;
    const expiresAt = typeof payload.exp === "number" ? payload.exp : undefined;

    if (expiresAt !== undefined && expiresAt <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      sub: payload.sub,
      id: typeof payload.id === "string" ? payload.id : payload.sub,
      phone: payload.phone,
      name: payload.name,
      upiId:
        payload.upiId === null || typeof payload.upiId === "string"
          ? payload.upiId
          : null,
      iat: issuedAt,
      exp: expiresAt,
      jti: typeof payload.jti === "string" ? payload.jti : undefined,
    };
  } catch {
    return null;
  }
}

export function extractSessionToken(headers: HeaderBag): string | null {
  const authorizationHeader = readHeader(headers, "authorization");

  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice(7).trim();
  }

  const cookieHeader = readHeader(headers, "cookie");

  if (!cookieHeader) {
    return null;
  }

  return readCookie(cookieHeader, getSessionCookieName());
}

export async function requireSessionUser(headers: HeaderBag): Promise<SessionUser> {
  const token = extractSessionToken(headers);

  if (!token) {
    throw new AppError(401, "Authentication required", "UNAUTHORIZED");
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    throw new AppError(401, "Invalid or expired session", "INVALID_SESSION");
  }

  return {
    id: payload.id,
    phone: payload.phone,
    name: payload.name,
    upiId: payload.upiId,
  };
}
