import { Platform } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../db/prisma'
import { authenticate } from '../../middleware/auth'
import { asyncHandler, ok } from '../../shared/http'
import { ItemRepository } from './item.repository'

const querySchema = z.object({ platform: z.nativeEnum(Platform).optional() })

export const itemRepo = new ItemRepository(prisma)
export const itemRouter = Router()

itemRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const query = querySchema.parse(req.query)
    ok(res, await itemRepo.list(query.platform))
  })
)
