import { PrismaClient } from '@prisma/client'
import { getEnv } from '../config/env'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Pattern: Singleton - keep one PrismaClient across hot reloads.
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const env = getEnv()
    globalForPrisma.prisma = new PrismaClient({
      log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  }
  return globalForPrisma.prisma
}

export const prisma = getPrisma()
