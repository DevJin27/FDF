import crypto from "crypto";

import { AppError } from "./errors";

export interface InternalTokenPayload {
  userId: string;
  email: string | null;
  name: string | null;
  image: string | null;
  exp: number;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function signInternalToken(
  payload: InternalTokenPayload,
  secret: string
) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifyInternalToken(token: string, secret: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    throw new AppError(401, "Malformed authorization token", "INVALID_TOKEN");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new AppError(401, "Invalid authorization token", "INVALID_TOKEN");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as InternalTokenPayload;

  if (payload.exp * 1000 <= Date.now()) {
    throw new AppError(401, "Authorization token expired", "TOKEN_EXPIRED");
  }

  return payload;
}
