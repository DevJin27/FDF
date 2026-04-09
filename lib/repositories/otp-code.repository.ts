import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "@/db";
import { otpCodes, type OTPCodeRow } from "@/db/schema";
import type { IOTPStore, OTPRecord, StoreOTPInput } from "@/types";

function mapOtpRecord(row: OTPCodeRow): OTPRecord {
  return {
    id: row.id,
    phone: row.phone,
    otpHash: row.otp_hash,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class OTPCodeRepository implements IOTPStore {
  constructor(private readonly db: Database) {}

  async upsert(input: StoreOTPInput): Promise<void> {
    const now = new Date();

    await this.db
      .insert(otpCodes)
      .values({
        phone: input.phone,
        otp_hash: input.otpHash,
        expires_at: input.expiresAt,
        consumed_at: null,
        created_at: now,
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: otpCodes.phone,
        set: {
          otp_hash: input.otpHash,
          expires_at: input.expiresAt,
          consumed_at: null,
          updated_at: now,
        },
      });
  }

  async findActiveByPhone(phone: string): Promise<OTPRecord | null> {
    const [row] = await this.db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumed_at)))
      .limit(1);

    return row ? mapOtpRecord(row) : null;
  }

  async invalidate(phone: string): Promise<void> {
    await this.db
      .update(otpCodes)
      .set({
        consumed_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumed_at)));
  }
}
