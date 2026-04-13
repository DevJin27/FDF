import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import {
  sendOtp,
  authenticatePhoneOtp,
  issueSessionToken,
  toSessionUser,
  SESSION_MAX_AGE_SECONDS,
  buildSuccessBody,
} from "@fdf/domain";
import type { AppContainer } from "../container.js";

export function createAuthRouter(container: AppContainer): Router {
  const router = Router();

  router.post(
    "/send-otp",
    asyncHandler(async (req, res) => {
      await sendOtp(req.body, container);
      res.status(200).json(buildSuccessBody({ sent: true }));
    }),
  );

  router.post(
    "/verify-otp",
    asyncHandler(async (req, res) => {
      const user = await authenticatePhoneOtp(req.body, container);
      const sessionUser = toSessionUser(user);
      const token = await issueSessionToken(sessionUser, SESSION_MAX_AGE_SECONDS);

      res.status(200).json(
        buildSuccessBody({
          token,
          user: sessionUser,
        }),
      );
    }),
  );

  return router;
}
