import { parseRequestJson } from "@/lib/http/request";
import { jsonSuccess, toSessionPayload, withErrorHandling } from "@/lib/http/response";
import {
  SESSION_MAX_AGE_SECONDS,
  getSessionCookieConfig,
  issueSessionToken,
} from "@/lib/session-token";
import { authenticatePhoneOtp } from "@/lib/use-cases/auth";

export async function POST(request: Request): Promise<Response> {
  return await withErrorHandling(async () => {
    const payload = await parseRequestJson<{ phone: string; otp: string }>(request);
    const user = await authenticatePhoneOtp(payload);
    const sessionUser = toSessionPayload(user);
    const token = await issueSessionToken(sessionUser, SESSION_MAX_AGE_SECONDS);
    const response = jsonSuccess({
      token,
      user: sessionUser,
    });
    const { name, options } = getSessionCookieConfig();

    response.cookies.set(name, token, options);

    return response;
  });
}
