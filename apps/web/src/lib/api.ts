import { auth } from "./auth";
import { createInternalApiToken } from "./internal-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be signed in");
  }

  const token = createInternalApiToken({
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null
  });

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Request failed");
  }

  return (await response.json()) as T;
}

export function getApiBaseUrl() {
  return API_URL;
}
