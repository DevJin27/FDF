import { describe, expect, it, vi } from "vitest";

import { GET, PATCH } from "@/app/api/users/[id]/route";
import { setContainerForTesting } from "@/lib/composition";
import { issueSessionToken, toSessionUser } from "@/lib/session-token";
import { createMockContainer, createMockUser } from "@/tests/helpers";

describe("/api/users/[id]", () => {
  it("returns the authenticated user's profile", async () => {
    const user = createMockUser({
      name: "Dev",
      upiId: "dev@upi",
      fdfStreak: 3,
      fdfUnlockedUntil: new Date("2026-04-16T00:00:00.000Z"),
    });
    const token = await issueSessionToken(toSessionUser(user));
    const container = createMockContainer({
      userRepository: {
        findByPhone: vi.fn(async () => user),
        findById: vi.fn(async () => user),
        create: vi.fn(async () => user),
        update: vi.fn(async () => user),
      },
    });
    setContainerForTesting(container);

    const response = await GET(
      new Request(`http://localhost/api/users/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      {
        params: Promise.resolve({ id: user.id }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        upiId: user.upiId,
        fdfStreak: 3,
        fdfUnlockedUntil: "2026-04-16T00:00:00.000Z",
      },
    });
  });

  it("updates the authenticated user's mutable profile fields", async () => {
    const user = createMockUser({
      name: "Dev",
      upiId: null,
    });
    const updatedUser = createMockUser({
      name: "Updated Dev",
      upiId: "dev@upi",
    });
    const token = await issueSessionToken(toSessionUser(user));
    const container = createMockContainer({
      userRepository: {
        findByPhone: vi.fn(async () => user),
        findById: vi.fn(async () => user),
        create: vi.fn(async () => user),
        update: vi.fn(async () => updatedUser),
      },
    });
    setContainerForTesting(container);

    const response = await PATCH(
      new Request(`http://localhost/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Updated Dev",
          upi_id: "dev@upi",
        }),
      }),
      {
        params: Promise.resolve({ id: user.id }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        id: user.id,
        name: "Updated Dev",
        upiId: "dev@upi",
      },
    });
  });

  it("blocks access to another user's profile", async () => {
    const user = createMockUser();
    const token = await issueSessionToken(toSessionUser(user));
    const container = createMockContainer();
    setContainerForTesting(container);

    const response = await GET(
      new Request("http://localhost/api/users/33333333-3333-4333-8333-333333333333", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      {
        params: Promise.resolve({
          id: "33333333-3333-4333-8333-333333333333",
        }),
      },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "FORBIDDEN",
      },
    });
  });
});
