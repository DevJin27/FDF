import { z } from 'zod'

export const createOrderSchema = z.object({
  sessionCode: z.string().min(3),
})
