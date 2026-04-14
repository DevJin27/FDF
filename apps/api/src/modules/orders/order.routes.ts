import { Router } from 'express'
import { prisma } from '../../db/prisma'
import { authenticate } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import { asyncHandler, ok } from '../../shared/http'
import { settlementService } from '../settlements/settlement.routes'
import { sessionRepo } from '../sessions/session.routes'
import { OrderRepository } from './order.repository'
import { OrderService } from './order.service'
import { createOrderSchema } from './order.schemas'

export const orderRepo = new OrderRepository(prisma)
export const orderService = new OrderService(orderRepo, sessionRepo, settlementService)
export const orderRouter = Router()

orderRouter.post(
  '/',
  authenticate,
  validateBody(createOrderSchema),
  asyncHandler(async (req, res) => {
    ok(res, await orderService.createOrder(req.body.sessionCode, req.user!.userId), 201)
  })
)

orderRouter.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    ok(res, await orderService.getOrder(req.params.id))
  })
)
