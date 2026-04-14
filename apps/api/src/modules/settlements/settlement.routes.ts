import { Router } from 'express'
import { prisma } from '../../db/prisma'
import { authenticate } from '../../middleware/auth'
import { asyncHandler, ok } from '../../shared/http'
import { sessionRepo } from '../sessions/session.routes'
import { SettlementRepository } from './settlement.repository'
import { SettlementService } from './settlement.service'

export const settlementRepo = new SettlementRepository(prisma)
export const settlementService = new SettlementService(settlementRepo, sessionRepo)
export const settlementRouter = Router({ mergeParams: true })

settlementRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    ok(res, await settlementService.getBreakdown(req.params.code))
  })
)

settlementRouter.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    ok(res, await settlementService.calculateAndPersist(req.params.code, req.user!.userId))
  })
)

settlementRouter.post(
  '/:memberId/mark-paid',
  authenticate,
  asyncHandler(async (req, res) => {
    ok(res, await settlementService.markPaid(req.params.code, req.params.memberId, req.user!.userId))
  })
)
