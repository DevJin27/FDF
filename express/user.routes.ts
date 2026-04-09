import { Router } from "express";

import { asyncHandler } from "@/express/async-handler";
import { getContainer, type AppContainer } from "@/lib/composition";
import { AppError } from "@/lib/errors/app-error";
import { buildSuccessBody } from "@/lib/http/response";
import { requireSessionUser } from "@/lib/session-token";
import { getUserProfile, updateUserProfile } from "@/lib/use-cases/users";

export function createUserRouter(
  container: AppContainer = getContainer(),
): Router {
  const router = Router();

  router.get(
    "/:id",
    asyncHandler(async (request, response) => {
      const session = await requireSessionUser(request.headers);

      if (session.id !== request.params.id) {
        throw new AppError(403, "You can only access your own profile", "FORBIDDEN");
      }

      const profile = await getUserProfile(request.params.id, container);
      response.status(200).json(buildSuccessBody(profile));
    }),
  );

  router.patch(
    "/:id",
    asyncHandler(async (request, response) => {
      const session = await requireSessionUser(request.headers);

      if (session.id !== request.params.id) {
        throw new AppError(403, "You can only update your own profile", "FORBIDDEN");
      }

      const profile = await updateUserProfile(
        request.params.id,
        request.body,
        container,
      );

      response.status(200).json(buildSuccessBody(profile));
    }),
  );

  return router;
}
