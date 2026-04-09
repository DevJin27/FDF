import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "@/middleware";
import { issueSessionToken, toSessionUser } from "@/lib/session-token";
import { createMockUser } from "@/tests/helpers";

describe("middleware", () => {
  it("allows authenticated protected requests", async () => {
    const user = createMockUser();
    const token = await issueSessionToken(toSessionUser(user));
    const request = new NextRequest("http://localhost/api/sessions/ping", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const response = await middleware(request);

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("returns 401 for unauthenticated protected requests", async () => {
    const request = new NextRequest("http://localhost/api/cart/ping");
    const response = await middleware(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });

  it("allows public auth routes", async () => {
    const request = new NextRequest("http://localhost/api/auth/send-otp");
    const response = await middleware(request);

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
