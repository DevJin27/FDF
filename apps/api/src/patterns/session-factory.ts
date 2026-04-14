import { Platform } from '@prisma/client'
import { customAlphabet } from 'nanoid'
import { toDecimal } from '../shared/money'

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8)

export interface SessionFactoryInput {
  name: string
  platform: Platform
  minOrder: number
  leaderId: string
  durationMinutes: number
}

// Pattern: Factory - normalize all session creation defaults in one place.
export class SessionFactory {
  static create(input: SessionFactoryInput) {
    return {
      code: nanoid(),
      name: input.name.trim(),
      platform: input.platform,
      minOrder: toDecimal(input.minOrder),
      leaderId: input.leaderId,
      deadline: new Date(Date.now() + input.durationMinutes * 60 * 1000),
    }
  }
}
