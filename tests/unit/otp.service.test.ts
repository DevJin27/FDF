import { describe, expect, it, vi } from "vitest";

import { OTPService } from "@/lib/services/otp.service";
import type { IOTPStore, ISMSProvider, OTPRecord } from "@/types";

function createOtpRecord(overrides: Partial<OTPRecord> = {}): OTPRecord {
  const now = new Date();

  return {
    id: "22222222-2222-4222-8222-222222222222",
    phone: "+919876543210",
    otpHash: "placeholder",
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
    consumedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("OTPService", () => {
  it("generates a 6-digit OTP", () => {
    const otpStore: IOTPStore = {
      upsert: vi.fn(async () => undefined),
      findActiveByPhone: vi.fn(async () => null),
      invalidate: vi.fn(async () => undefined),
    };
    const smsProvider: ISMSProvider = {
      sendOtp: vi.fn(async () => undefined),
    };
    const service = new OTPService(otpStore, smsProvider);

    expect(service.generate()).toMatch(/^\d{6}$/);
  });

  it("stores the OTP and sends it through the SMS provider", async () => {
    const otpStore: IOTPStore = {
      upsert: vi.fn(async () => undefined),
      findActiveByPhone: vi.fn(async () => null),
      invalidate: vi.fn(async () => undefined),
    };
    const smsProvider: ISMSProvider = {
      sendOtp: vi.fn(async () => undefined),
    };
    const service = new OTPService(otpStore, smsProvider);

    await service.store("+919876543210", "123456");

    expect(otpStore.upsert).toHaveBeenCalledTimes(1);
    expect(smsProvider.sendOtp).toHaveBeenCalledWith("+919876543210", "123456");
  });

  it("invalidates the OTP when SMS delivery fails", async () => {
    const otpStore: IOTPStore = {
      upsert: vi.fn(async () => undefined),
      findActiveByPhone: vi.fn(async () => null),
      invalidate: vi.fn(async () => undefined),
    };
    const smsProvider: ISMSProvider = {
      sendOtp: vi.fn(async () => {
        throw new Error("provider down");
      }),
    };
    const service = new OTPService(otpStore, smsProvider);

    await expect(service.store("+919876543210", "123456")).rejects.toThrow(
      "Failed to send OTP",
    );
    expect(otpStore.invalidate).toHaveBeenCalledWith("+919876543210");
  });

  it("verifies and invalidates a matching OTP", async () => {
    const otpStore: IOTPStore = {
      upsert: vi.fn(async () => undefined),
      findActiveByPhone: vi.fn(async () => createOtpRecord()),
      invalidate: vi.fn(async () => undefined),
    };
    const smsProvider: ISMSProvider = {
      sendOtp: vi.fn(async () => undefined),
    };
    const service = new OTPService(otpStore, smsProvider);
    await service.store("+919876543210", "123456");

    const recordCall = (otpStore.upsert as ReturnType<typeof vi.fn>).mock.calls[0];
    const storedOtpHash = recordCall?.[0]?.otpHash as string;

    (otpStore.findActiveByPhone as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      createOtpRecord({
        otpHash: storedOtpHash,
      }),
    );

    await expect(service.verify("+919876543210", "123456")).resolves.toBe(true);
    expect(otpStore.invalidate).toHaveBeenCalledWith("+919876543210");
  });

  it("rejects expired OTPs", async () => {
    const otpStore: IOTPStore = {
      upsert: vi.fn(async () => undefined),
      findActiveByPhone: vi.fn(async () =>
        createOtpRecord({
          expiresAt: new Date(Date.now() - 1000),
        }),
      ),
      invalidate: vi.fn(async () => undefined),
    };
    const smsProvider: ISMSProvider = {
      sendOtp: vi.fn(async () => undefined),
    };
    const service = new OTPService(otpStore, smsProvider);

    await expect(service.verify("+919876543210", "123456")).resolves.toBe(false);
    expect(otpStore.invalidate).toHaveBeenCalledWith("+919876543210");
  });
});
