import { AppError } from "../errors/app-error.js";
import type { IOTPService, IUserRepository } from "../types/interfaces.js";
import { sendOtpSchema, verifyOtpSchema } from "../validation/schemas.js";
import type { SendOtpInput, VerifyOtpInput } from "../validation/schemas.js";
import type { UserRow } from "@fdf/db";

export interface AuthContainer {
  otpService: IOTPService;
  userRepository: IUserRepository;
}

export async function sendOtp(
  rawInput: unknown,
  container: AuthContainer,
): Promise<void> {
  const result = sendOtpSchema.safeParse(rawInput);
  if (!result.success) {
    throw new AppError(
      422,
      result.error.issues[0]?.message ?? "Invalid input",
      "BAD_REQUEST",
    );
  }

  const { phone } = result.data;
  await container.otpService.sendOtp(phone);
}

export async function authenticatePhoneOtp(
  rawInput: unknown,
  container: AuthContainer,
): Promise<UserRow> {
  const result = verifyOtpSchema.safeParse(rawInput);
  if (!result.success) {
    throw new AppError(
      422,
      result.error.issues[0]?.message ?? "Invalid input",
      "BAD_REQUEST",
    );
  }

  const { phone, otp } = result.data;
  await container.otpService.verifyOtp(phone, otp);

  let user = await container.userRepository.findByPhone(phone);
  if (!user) {
    // Auto-register on first successful OTP
    user = await container.userRepository.create({
      phone,
      name: phone, // placeholder — user can update later
    });
  }

  return user;
}
