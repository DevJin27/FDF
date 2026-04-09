import { Router } from "express";

import { asyncHandler } from "@/express/async-handler";
import { getContainer, type AppContainer } from "@/lib/composition";
import { buildSuccessBody } from "@/lib/http/response";
import {
  SESSION_MAX_AGE_SECONDS,
  issueSessionToken,
  toSessionUser,
} from "@/lib/session-token";
import { authenticatePhoneOtp, sendOtp } from "@/lib/use-cases/auth";

export function createAuthRouter(
  container: AppContainer = getContainer(),
): Router {
  const router = Router();

  router.post(
    "/send-otp",
    asyncHandler(async (request, response) => {
      await sendOtp(request.body, container);
      response.status(200).json({ success: true });
    }),
  );

  router.post(
    "/verify-otp",
    asyncHandler(async (request, response) => {
      const user = await authenticatePhoneOtp(request.body, container);
      const sessionUser = toSessionUser(user);
      const token = await issueSessionToken(sessionUser, SESSION_MAX_AGE_SECONDS);

      response.status(200).json(
        buildSuccessBody({
          token,
          user: sessionUser,
        }),
      );
    }),
  );

  return router;
}
