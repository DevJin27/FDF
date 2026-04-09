import { vi } from "vitest";

import type { AppContainer } from "@/lib/composition";
import type { AppUser } from "@/types";

export function createMockUser(overrides: Partial<AppUser> = {}): AppUser {
  const baseDate = new Date("2026-04-09T00:00:00.000Z");

  return {
    id: "11111111-1111-4111-8111-111111111111",
    phone: "+919876543210",
    name: "Guest 3210",
    upiId: null,
    fdfStreak: 0,
    fdfUnlockedUntil: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

export function createMockContainer(
  overrides: Partial<AppContainer> = {},
): AppContainer {
  const defaultUser = createMockUser();

  return {
    db: {} as AppContainer["db"],
    otpStore: {
      upsert: vi.fn(async () => undefined),
      findActiveByPhone: vi.fn(async () => null),
      invalidate: vi.fn(async () => undefined),
    },
    otpService: {
      generate: vi.fn(() => "123456"),
      store: vi.fn(async () => undefined),
      verify: vi.fn(async () => true),
      invalidate: vi.fn(async () => undefined),
    },
    smsProvider: {
      sendOtp: vi.fn(async () => undefined),
    },
    userRepository: {
      findByPhone: vi.fn(async () => defaultUser),
      findById: vi.fn(async () => defaultUser),
      create: vi.fn(async (input) =>
        createMockUser({
          phone: input.phone,
          name: input.name,
          upiId: input.upiId ?? null,
        }),
      ),
      update: vi.fn(async (id, input) =>
        createMockUser({
          id,
          name: input.name ?? defaultUser.name,
          upiId: input.upiId ?? defaultUser.upiId,
          updatedAt: new Date("2026-04-10T00:00:00.000Z"),
        }),
      ),
    },
    ...overrides,
  };
}
