import { AppError } from "@/lib/errors/app-error";
import { generateSixDigitOtp, hashOtp, safeEqualHash } from "@/lib/security";
import type { IOTPService, IOTPStore, ISMSProvider } from "@/types";

interface OTPServiceOptions {
  ttlMinutes?: number;
}

export class OTPService implements IOTPService {
  private readonly ttlMinutes: number;

  constructor(
    private readonly otpStore: IOTPStore,
    private readonly smsProvider: ISMSProvider,
    options: OTPServiceOptions = {},
  ) {
    this.ttlMinutes = options.ttlMinutes ?? 5;
  }

  generate(): string {
    return generateSixDigitOtp();
  }

  async store(phone: string, otp: string): Promise<void> {
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60 * 1000);

    await this.otpStore.upsert({
      phone,
      otpHash: hashOtp(otp),
      expiresAt,
    });

    try {
      await this.smsProvider.sendOtp(phone, otp);
    } catch (error) {
      await this.invalidate(phone);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(502, "Failed to send OTP", "OTP_SEND_FAILED");
    }
  }

  async verify(phone: string, otp: string): Promise<boolean> {
    const record = await this.otpStore.findActiveByPhone(phone);

    if (!record) {
      return false;
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await this.invalidate(phone);
      return false;
    }

    const isMatch = safeEqualHash(hashOtp(otp), record.otpHash);

    if (!isMatch) {
      return false;
    }

    await this.invalidate(phone);
    return true;
  }

  async invalidate(phone: string): Promise<void> {
    await this.otpStore.invalidate(phone);
  }
}
