import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { getEnv } from '../config/env'
import { prisma } from '../db/prisma'
import { AppError } from '../shared/http'
import { JwtPayload } from '../shared/types'

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getEnv().JWT_SECRET, { expiresIn: '7d' })
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next(new AppError('Missing or invalid Authorization header', 401, 'UNAUTHORIZED'))
    return
  }

  try {
    const payload = jwt.verify(header.slice(7), getEnv().JWT_SECRET) as JwtPayload
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, phone: true },
    })

    if (!user) {
      next(new AppError('Invalid or expired session', 401, 'INVALID_SESSION'))
      return
    }

    req.user = { userId: user.id, phone: user.phone }
    next()
  } catch {
    next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'))
  }
}
