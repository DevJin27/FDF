import { Router } from "express";

import { OrderIntentService } from "../services/order-intent-service";

export function createIntentRouter(service: OrderIntentService) {
  const router = Router();

  router.post("/", async (request, response, next) => {
    try {
      const intent = await service.createIntent(request.user!, request.body);
      response.status(201).json(intent);
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", async (request, response, next) => {
    try {
      const intents = await service.listMyIntents(request.user!.id);
      response.json({ intents });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/cancel", async (request, response, next) => {
    try {
      const intent = await service.cancelIntent(request.user!.id, request.params.id);
      response.json(intent);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
