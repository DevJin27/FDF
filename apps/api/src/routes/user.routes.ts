import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { AppError, buildSuccessBody, getUserProfile, updateUserProfile } from "@fdf/domain";
import type { AppContainer } from "../container.js";

export function createUserRouter(container: AppContainer): Router {
  const router = Router();

  router.use(requireAuth);

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const session = req.sessionUser!;
      if (session.id !== req.params.id) {
        throw new AppError(403, "You can only access your own profile", "FORBIDDEN");
      }

      const profile = await getUserProfile(req.params.id, container);
      res.status(200).json(buildSuccessBody(profile));
    }),
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const session = req.sessionUser!;
      if (session.id !== req.params.id) {
        throw new AppError(403, "You can only update your own profile", "FORBIDDEN");
      }

      const profile = await updateUserProfile(req.params.id, req.body, container);
      res.status(200).json(buildSuccessBody(profile));
    }),
  );

  return router;
}
