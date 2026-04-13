import type { OTPCodeRow } from "@fdf/db";
import type { UserRow, NewUserRow } from "@fdf/db";
import type { UpdateUserInput } from "../validation/schemas.js";

// ── Repository interfaces ──────────────────────────────────────────────────────
export interface IUserRepository {
  findByPhone(phone: string): Promise<UserRow | undefined>;
  findById(id: string): Promise<UserRow | undefined>;
  create(data: Pick<NewUserRow, "phone" | "name">): Promise<UserRow>;
  update(id: string, data: UpdateUserInput): Promise<UserRow>;
}

export interface IOTPStore {
  upsert(phone: string, otpHash: string, expiresAt: Date): Promise<OTPCodeRow>;
  findByPhone(phone: string): Promise<OTPCodeRow | undefined>;
  markConsumed(id: string): Promise<void>;
}

// ── Service interfaces ─────────────────────────────────────────────────────────
export interface ISMSProvider {
  sendOTP(phone: string, otp: string): Promise<void>;
}

export interface IOTPService {
  sendOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, otp: string): Promise<boolean>;
}
