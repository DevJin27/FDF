import { Platform } from '@prisma/client'
import { z } from 'zod'

export const createSessionSchema = z.object({
  name: z.string().min(3, 'Session name must be at least 3 characters').max(80),
  platform: z.nativeEnum(Platform),
  minOrder: z.coerce.number().min(1).max(100000),
  durationMinutes: z.coerce.number().int().min(1).max(180),
})
