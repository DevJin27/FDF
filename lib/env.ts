import { AppError } from "@/lib/errors/app-error";

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new AppError(500, `${name} is not configured`, "ENV_CONFIG_MISSING");
  }

  return value;
}

export function getOptionalEnv(
  name: string,
  fallback?: string,
): string | undefined {
  return process.env[name] ?? fallback;
}
