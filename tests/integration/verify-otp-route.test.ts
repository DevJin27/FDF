import { describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/verify-otp/route";
import { setContainerForTesting } from "@/lib/composition";
import { createMockContainer, createMockUser } from "@/tests/helpers";

describe("POST /api/auth/verify-otp", () => {
  it("returns a session token and user payload for a valid OTP", async () => {
    const user = createMockUser({
      name: "Dev",
      upiId: "dev@upi",
    });
    const container = createMockContainer({
      otpService: {
        generate: vi.fn(() => "123456"),
        store: vi.fn(async () => undefined),
        verify: vi.fn(async () => true),
        invalidate: vi.fn(async () => undefined),
      },
      userRepository: {
        findByPhone: vi.fn(async () => user),
        findById: vi.fn(async () => user),
        create: vi.fn(async () => user),
        update: vi.fn(async () => user),
      },
    });
    setContainerForTesting(container);

    const response = await POST(
      new Request("http://localhost/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: "9876543210",
          otp: "123456",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          upiId: user.upiId,
        },
      },
    });
    expect(typeof body.data.token).toBe("string");
    expect(response.headers.get("set-cookie")).toContain("next-auth.session-token=");
  });

  it("returns 401 when the OTP is invalid", async () => {
    const container = createMockContainer({
      otpService: {
        generate: vi.fn(() => "123456"),
        store: vi.fn(async () => undefined),
        verify: vi.fn(async () => false),
        invalidate: vi.fn(async () => undefined),
      },
    });
    setContainerForTesting(container);

    const response = await POST(
      new Request("http://localhost/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: "9876543210",
          otp: "654321",
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "INVALID_OTP",
      },
    });
  });
});
