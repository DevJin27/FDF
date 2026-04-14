import { z } from 'zod'

export const sendOtpSchema = z.object({
  phone: z.string().min(10, 'Enter a valid phone number').max(15),
})

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().length(6, 'OTP must be 6 digits'),
  name: z.string().min(1).max(80).optional(),
  upiId: z.string().min(3).max(120).optional(),
})
