export interface OTPRecord {
  id: string;
  phone: string;
  otpHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreOTPInput {
  phone: string;
  otpHash: string;
  expiresAt: Date;
}
