import { eq } from "drizzle-orm";
import type { Database } from "@fdf/db";
import { otpCodes } from "@fdf/db";
import type { OTPCodeRow } from "@fdf/db";
import { AppError } from "../errors/app-error.js";
import type { IOTPStore } from "../types/interfaces.js";

export class OTPCodeRepository implements IOTPStore {
  constructor(private readonly db: Database) {}

  async upsert(
    phone: string,
    otpHash: string,
    expiresAt: Date,
  ): Promise<OTPCodeRow> {
    const [row] = await this.db
      .insert(otpCodes)
      .values({ phone, otp_hash: otpHash, expires_at: expiresAt })
      .onConflictDoUpdate({
        target: otpCodes.phone,
        set: {
          otp_hash: otpHash,
          expires_at: expiresAt,
          consumed_at: null,
          updated_at: new Date(),
        },
      })
      .returning();

    if (!row)
      throw new AppError(500, "Failed to store OTP", "INTERNAL_ERROR");
    return row;
  }

  async findByPhone(phone: string): Promise<OTPCodeRow | undefined> {
    const [row] = await this.db
      .select()
      .from(otpCodes)
      .where(eq(otpCodes.phone, phone))
      .limit(1);
    return row;
  }

  async markConsumed(id: string): Promise<void> {
    await this.db
      .update(otpCodes)
      .set({ consumed_at: new Date(), updated_at: new Date() })
      .where(eq(otpCodes.id, id));
  }
}
