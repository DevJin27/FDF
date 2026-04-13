import { randomInt } from "node:crypto";
import { AppError } from "../errors/app-error.js";
import type { IOTPService, IOTPStore, ISMSProvider } from "../types/interfaces.js";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_DIGITS = 6;

function generateOtp(): string {
  return String(randomInt(10 ** (OTP_DIGITS - 1), 10 ** OTP_DIGITS));
}

async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class OTPService implements IOTPService {
  constructor(
    private readonly store: IOTPStore,
    private readonly sms: ISMSProvider,
  ) {}

  async sendOtp(phone: string): Promise<void> {
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.store.upsert(phone, otpHash, expiresAt);
    await this.sms.sendOTP(phone, otp);
  }

  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const record = await this.store.findByPhone(phone);

    if (!record) {
      throw new AppError(400, "No OTP found for this number", "INVALID_OTP");
    }

    if (record.consumed_at) {
      throw new AppError(400, "OTP already used", "OTP_ALREADY_CONSUMED");
    }

    if (record.expires_at < new Date()) {
      throw new AppError(400, "OTP has expired", "OTP_EXPIRED");
    }

    const inputHash = await hashOtp(otp);
    if (inputHash !== record.otp_hash) {
      throw new AppError(400, "Invalid OTP", "INVALID_OTP");
    }

    await this.store.markConsumed(record.id);
    return true;
  }
}
