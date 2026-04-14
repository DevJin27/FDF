import { z } from 'zod'

export const addCartItemSchema = z.object({
  memberId: z.string().min(1),
  itemId: z.string().min(1).optional(),
  name: z.string().min(1).max(100),
  price: z.coerce.number().min(1).max(100000),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
})
