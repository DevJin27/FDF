import { jsonSuccess, withErrorHandling } from "@/lib/http/response";
import { SessionService } from "@/lib/session-service";
import { requireSessionUser } from "@/lib/session-token";

interface RouteContext {
  params: Promise<{
    code: string;
  }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  return await withErrorHandling(async () => {
    const sessionUser = await requireSessionUser(request.headers);
    const { code } = await context.params;
    const sessionService = SessionService.getInstance();
    const state = await sessionService.joinSession(sessionUser.id, code);

    return jsonSuccess(state);
  });
}
