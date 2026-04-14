import { Router } from 'express'
import { prisma } from '../../db/prisma'
import { authenticate } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import { asyncHandler, ok } from '../../shared/http'
import { sessionRepo } from '../sessions/session.routes'
import { CartRepository } from './cart.repository'
import { CartService } from './cart.service'
import { addCartItemSchema } from './cart.schemas'

export const cartRepo = new CartRepository(prisma)
export const cartService = new CartService(cartRepo, sessionRepo)
export const cartRouter = Router({ mergeParams: true })

cartRouter.post(
  '/',
  authenticate,
  validateBody(addCartItemSchema),
  asyncHandler(async (req, res) => {
    ok(res, await cartService.addItem(req.params.code, req.user!.userId, req.body), 201)
  })
)

cartRouter.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await cartService.removeItem(req.params.code, req.params.id, req.user!.userId)
    ok(res, { deleted: true })
  })
)
