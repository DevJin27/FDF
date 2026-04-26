import { Router } from "express";
import { z } from "zod";

import { UserRepository } from "../repositories/user-repository";

const schema = z.object({
  upiId: z.string().min(3).max(128).nullable()
});

export function createProfileRouter(userRepository: UserRepository) {
  const router = Router();

  router.patch("/upi", async (request, response, next) => {
    try {
      const input = schema.parse(request.body);
      const user = await userRepository.updateUpiId(request.user!.id, input.upiId);
      response.json({
        user: {
          id: user?.id,
          upiId: user?.upiId ?? null
        }
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
