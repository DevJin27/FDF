import { z } from "zod";

// ── Phone ──────────────────────────────────────────────────────────────────────
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number");

// ── OTP ────────────────────────────────────────────────────────────────────────
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, "OTP must be 4-8 digits");

// ── Auth requests ──────────────────────────────────────────────────────────────
export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// ── User update ────────────────────────────────────────────────────────────────
export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  upi_id: z.string().trim().max(100).optional().nullable(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
