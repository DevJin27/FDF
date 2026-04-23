import { AppError } from "@/lib/errors/app-error";
import { jsonSuccess, withErrorHandling } from "@/lib/http/response";
import { SessionService } from "@/lib/session-service";
import { requireSessionUser } from "@/lib/session-token";

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
    const sessionUser = await requireSessionUser(request.headers);
    const { id } = await context.params;
    const sessionService = SessionService.getInstance();
    const state = await sessionService.getSessionState(id);
    const isParticipant =
      state.session.leaderId === sessionUser.id ||
      state.members.some((member) => member.user.id === sessionUser.id);

    if (!isParticipant) {
      throw new AppError(
        403,
        "You are not a participant in this session",
        "FORBIDDEN",
      );
    }

    return jsonSuccess(state);
  });
}
