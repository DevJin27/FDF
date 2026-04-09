import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Phone must be a valid 10-digit Indian mobile number");

const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "OTP must be a valid 6-digit code");

const upiIdSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().trim().max(100).nullable(),
);

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
});

export const userIdSchema = z.string().uuid("Invalid user id");

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    upi_id: upiIdSchema.optional(),
  })
  .refine((input) => input.name !== undefined || input.upi_id !== undefined, {
    message: "At least one field must be provided",
  });
