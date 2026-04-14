import { getEnv } from '../config/env'

export interface OtpProvider {
  sendOtp(phone: string, code: string): Promise<void>
}

class ConsoleOtpProvider implements OtpProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    const expiresIn = getEnv().OTP_EXPIRY_SECONDS
    console.log(`[OTP] ${phone}: ${code} (expires in ${expiresIn}s)`)
  }
}

// Pattern: Adapter - the app talks to OtpProvider, local dev uses console output.
export function createOtpProvider(): OtpProvider {
  return new ConsoleOtpProvider()
}
