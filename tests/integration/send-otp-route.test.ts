import { describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/send-otp/route";
import { setContainerForTesting } from "@/lib/composition";
import { createMockContainer } from "@/tests/helpers";

describe("POST /api/auth/send-otp", () => {
  it("stores a generated OTP for a valid phone number", async () => {
    const container = createMockContainer();
    setContainerForTesting(container);

    const response = await POST(
      new Request("http://localhost/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: "9876543210",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(container.otpService.generate).toHaveBeenCalledTimes(1);
    expect(container.otpService.store).toHaveBeenCalledWith(
      "+919876543210",
      "123456",
    );
  });

  it("rejects invalid phone numbers", async () => {
    const container = createMockContainer();
    setContainerForTesting(container);

    const response = await POST(
      new Request("http://localhost/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: "123",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
      },
    });
    expect(container.otpService.store).not.toHaveBeenCalled();
  });
});
