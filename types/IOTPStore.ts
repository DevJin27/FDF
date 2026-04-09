import type { OTPRecord, StoreOTPInput } from "@/types/otp";

export interface IOTPStore {
  upsert(input: StoreOTPInput): Promise<void>;
  findActiveByPhone(phone: string): Promise<OTPRecord | null>;
  invalidate(phone: string): Promise<void>;
}
