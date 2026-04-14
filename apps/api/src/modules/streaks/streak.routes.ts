import { Router } from 'express'
import { prisma } from '../../db/prisma'
import { authenticate } from '../../middleware/auth'
import { asyncHandler, ok } from '../../shared/http'
import { StreakRepository } from './streak.repository'
import { StreakService } from './streak.service'

const streakRepo = new StreakRepository(prisma)
export const streakService = new StreakService(streakRepo)
export const streakRouter = Router()

streakRouter.get(
  '/me/streak',
  authenticate,
  asyncHandler(async (req, res) => {
    ok(res, await streakService.getStreak(req.user!.userId))
  })
)

streakRouter.get(
  '/:id/streak',
  authenticate,
  asyncHandler(async (req, res) => {
    ok(res, await streakService.getStreak(req.params.id))
  })
)
