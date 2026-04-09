import { describe, expect, it } from "vitest";

import { authOptions } from "@/lib/auth";
import { createMockUser } from "@/tests/helpers";

describe("authOptions", () => {
  it("adds id, phone, name, and upiId to JWT and session callbacks", async () => {
    const user = createMockUser({
      name: "Dev",
      upiId: "dev@upi",
    });

    const token = await authOptions.callbacks?.jwt?.({
      token: {},
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        upiId: user.upiId,
      },
      trigger: "signIn",
    } as any);

    expect(token).toMatchObject({
      sub: user.id,
      id: user.id,
      phone: user.phone,
      name: user.name,
      upiId: user.upiId,
    });

    const session = await authOptions.callbacks?.session?.({
      session: {
        user: {},
        expires: "2099-01-01T00:00:00.000Z",
      },
      token,
    } as any);

    expect(session?.user).toMatchObject({
      id: user.id,
      phone: user.phone,
      name: user.name,
      upiId: user.upiId,
    });
  });

  it("encodes and decodes the custom session token shape", async () => {
    const user = createMockUser({
      name: "Dev",
      upiId: "dev@upi",
    });

    const token = await authOptions.jwt?.encode?.({
      token: {
        sub: user.id,
        id: user.id,
        phone: user.phone,
        name: user.name,
        upiId: user.upiId,
      },
    } as any);

    const decoded = await authOptions.jwt?.decode?.({
      token,
    } as any);

    expect(decoded).toMatchObject({
      sub: user.id,
      id: user.id,
      phone: user.phone,
      name: user.name,
      upiId: user.upiId,
    });
  });
});
