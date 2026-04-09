import { AppError } from "@/lib/errors/app-error";

export async function parseRequestJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new AppError(400, "Invalid JSON body", "INVALID_JSON");
  }
}
