import { Router } from 'express'
import { prisma } from '../../db/prisma'
import { asyncHandler, ok } from '../../shared/http'
import { validateBody } from '../../middleware/validate'
import { AuthService } from './auth.service'
import { sendOtpSchema, verifyOtpSchema } from './auth.schemas'

export const authService = new AuthService(prisma)
export const authRouter = Router()

authRouter.post(
  '/otp/send',
  validateBody(sendOtpSchema),
  asyncHandler(async (req, res) => {
    ok(res, await authService.sendOtp(req.body.phone))
  })
)

authRouter.post(
  '/otp/verify',
  validateBody(verifyOtpSchema),
  asyncHandler(async (req, res) => {
    ok(res, await authService.verifyOtp(req.body))
  })
)
