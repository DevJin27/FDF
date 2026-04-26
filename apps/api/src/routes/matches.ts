import { Router } from "express";

import { MatchRoomService } from "../services/match-room-service";
import { SettlementService } from "../services/settlement-service";

export function createMatchRouter(
  matchRoomService: MatchRoomService,
  settlementService: SettlementService
) {
  const router = Router();

  router.get("/current", async (request, response, next) => {
    try {
      const room = await matchRoomService.getCurrentForUser(request.user!.id);
      response.json({ room });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    try {
      const room = await matchRoomService.getById(request.params.id);
      response.json(room);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/lock", async (request, response, next) => {
    try {
      const room = await matchRoomService.lockRoom(request.user!, request.params.id);
      response.json(room);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/payments/:memberId/mark-paid", async (request, response, next) => {
    try {
      const settlement = await settlementService.markPaid(
        request.user!,
        request.params.id,
        request.params.memberId
      );
      response.json(settlement);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
