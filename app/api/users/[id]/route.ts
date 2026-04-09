import { AppError } from "@/lib/errors/app-error";
import { parseRequestJson } from "@/lib/http/request";
import { jsonSuccess, withErrorHandling } from "@/lib/http/response";
import { requireSessionUser } from "@/lib/session-token";
import { getUserProfile, updateUserProfile } from "@/lib/use-cases/users";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  return await withErrorHandling(async () => {
    const { id } = await context.params;
    const session = await requireSessionUser(request.headers);

    if (session.id !== id) {
      throw new AppError(403, "You can only access your own profile", "FORBIDDEN");
    }

    const profile = await getUserProfile(id);
    return jsonSuccess(profile);
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  return await withErrorHandling(async () => {
    const { id } = await context.params;
    const session = await requireSessionUser(request.headers);

    if (session.id !== id) {
      throw new AppError(403, "You can only update your own profile", "FORBIDDEN");
    }

    const payload = await parseRequestJson<{
      name?: string;
      upi_id?: string | null;
    }>(request);
    const profile = await updateUserProfile(id, payload);

    return jsonSuccess(profile);
  });
}
