import type { AppUser } from "@/types";

import { getContainer, type AppContainer } from "@/lib/composition";
import { AppError } from "@/lib/errors/app-error";
import { createFallbackUserName, normalizeIndianPhone } from "@/lib/phone";
import { sendOtpSchema, verifyOtpSchema } from "@/lib/validation/auth";

export async function sendOtp(
  input: unknown,
  container: AppContainer = getContainer(),
): Promise<void> {
  const { phone } = sendOtpSchema.parse(input);
  const normalizedPhone = normalizeIndianPhone(phone);
  const otp = container.otpService.generate();

  await container.otpService.store(normalizedPhone, otp);
}

export async function authenticatePhoneOtp(
  input: unknown,
  container: AppContainer = getContainer(),
): Promise<AppUser> {
  const { phone, otp } = verifyOtpSchema.parse(input);
  const normalizedPhone = normalizeIndianPhone(phone);
  const isOtpValid = await container.otpService.verify(normalizedPhone, otp);

  if (!isOtpValid) {
    throw new AppError(401, "Invalid or expired OTP", "INVALID_OTP");
  }

  let user = await container.userRepository.findByPhone(normalizedPhone);

  if (!user) {
    user = await container.userRepository.create({
      phone: normalizedPhone,
      name: createFallbackUserName(phone),
      upiId: null,
    });
  }

  return user;
}
