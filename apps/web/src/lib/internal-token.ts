import crypto from "crypto";

interface InternalTokenUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function createInternalApiToken(user: InternalTokenUser) {
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is required");
  }

  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    exp: Math.floor(Date.now() / 1000) + 60 * 60
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}
