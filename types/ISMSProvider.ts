export interface ISMSProvider {
  sendOtp(phone: string, otp: string): Promise<void>;
}
