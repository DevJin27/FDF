import { PrismaClient } from '@prisma/client'
import { getEnv } from '../../config/env'
import { createOtpProvider, OtpProvider } from '../../patterns/otp-provider-adapter'
import { AppError } from '../../shared/http'
import { signToken } from '../../middleware/auth'

type OtpEntry = { code: string; expiresAt: number }

export class AuthService {
  private readonly otpStore = new Map<string, OtpEntry>()

  constructor(
    private readonly db: PrismaClient,
    private readonly otpProvider: OtpProvider = createOtpProvider()
  ) {}

  async sendOtp(phone: string): Promise<{ message: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    this.otpStore.set(phone, {
      code,
      expiresAt: Date.now() + getEnv().OTP_EXPIRY_SECONDS * 1000,
    })
    await this.otpProvider.sendOtp(phone, code)
    return { message: 'OTP sent. For local development, check the API console.' }
  }

  async verifyOtp(input: { phone: string; code: string; name?: string; upiId?: string }) {
    const entry = this.otpStore.get(input.phone)
    if (!entry || Date.now() > entry.expiresAt || entry.code !== input.code) {
      if (entry && Date.now() > entry.expiresAt) this.otpStore.delete(input.phone)
      throw new AppError('Invalid or expired OTP', 401, 'INVALID_OTP')
    }

    this.otpStore.delete(input.phone)

    const user = await this.db.user.upsert({
      where: { phone: input.phone },
      create: { phone: input.phone, name: input.name ?? null, upiId: input.upiId ?? null },
      update: { name: input.name ?? undefined, upiId: input.upiId ?? undefined },
    })

    return {
      token: signToken({ userId: user.id, phone: user.phone }),
      user: { id: user.id, phone: user.phone, name: user.name, upiId: user.upiId },
    }
  }
}
