import type { UserRow } from "@fdf/db";

// ── User domain types ──────────────────────────────────────────────────────────
export type SessionUser = {
  id: string;
  phone: string;
  name: string;
};

export type UserProfile = {
  id: string;
  phone: string;
  name: string;
  upi_id: string | null;
  fdf_streak: number;
  fdf_unlocked_until: Date | null;
  created_at: Date;
};

// ── OTP domain types ───────────────────────────────────────────────────────────
export type OTPValidation = {
  valid: boolean;
  expired: boolean;
  consumed: boolean;
};

// ── HTTP response shapes ───────────────────────────────────────────────────────
export type ApiSuccessBody<T> = {
  success: true;
  data: T;
};

export type ApiErrorBody = {
  success: false;
  error: {
    message: string;
    code: string;
  };
};

export type ApiBody<T> = ApiSuccessBody<T> | ApiErrorBody;

// ── Helper builders ────────────────────────────────────────────────────────────
export function buildSuccessBody<T>(data: T): ApiSuccessBody<T> {
  return { success: true, data };
}

export function toUserProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    upi_id: row.upi_id ?? null,
    fdf_streak: row.fdf_streak,
    fdf_unlocked_until: row.fdf_unlocked_until ?? null,
    created_at: row.created_at,
  };
}

export function toSessionUser(row: UserRow): SessionUser {
  return { id: row.id, phone: row.phone, name: row.name };
}
