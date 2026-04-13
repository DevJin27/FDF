import type { ISMSProvider } from "../types/interfaces.js";

/**
 * Development-only SMS provider.
 * Prints the OTP to the console instead of sending a real SMS.
 * Swap this out for MSG91SMSProvider (or any ISMSProvider) in production.
 */
export class ConsoleSMSProvider implements ISMSProvider {
  async sendOTP(phone: string, otp: string): Promise<void> {
    console.log("──────────────────────────────────────");
    console.log(`[DEV OTP] Phone : ${phone}`);
    console.log(`[DEV OTP] Code  : ${otp}`);
    console.log("──────────────────────────────────────");
  }
}
