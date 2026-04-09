import { describe, expect, it, vi } from "vitest";

import { UserRepository } from "@/lib/repositories/user.repository";

const baseRow = {
  id: "11111111-1111-4111-8111-111111111111",
  phone: "+919876543210",
  name: "Dev",
  upi_id: null,
  fdf_streak: 2,
  fdf_unlocked_until: null,
  created_at: new Date("2026-04-09T00:00:00.000Z"),
  updated_at: new Date("2026-04-09T00:00:00.000Z"),
};

describe("UserRepository", () => {
  it("maps records when finding a user by phone", async () => {
    const limit = vi.fn(async () => [baseRow]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const db = {
      select,
    } as any;
    const repository = new UserRepository(db);

    const user = await repository.findByPhone("+919876543210");

    expect(user).toEqual({
      id: baseRow.id,
      phone: baseRow.phone,
      name: baseRow.name,
      upiId: null,
      fdfStreak: 2,
      fdfUnlockedUntil: null,
      createdAt: baseRow.created_at,
      updatedAt: baseRow.updated_at,
    });
  });

  it("creates a user through the repository", async () => {
    const returning = vi.fn(async () => [baseRow]);
    const values = vi.fn(() => ({ returning }));
    const insert = vi.fn(() => ({ values }));
    const db = {
      insert,
    } as any;
    const repository = new UserRepository(db);

    const user = await repository.create({
      phone: baseRow.phone,
      name: baseRow.name,
      upiId: null,
    });

    expect(user.name).toBe("Dev");
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("updates the mutable user fields", async () => {
    const returning = vi.fn(async () => [
      {
        ...baseRow,
        name: "Updated Dev",
        upi_id: "dev@upi",
      },
    ]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    const db = {
      update,
    } as any;
    const repository = new UserRepository(db);

    const user = await repository.update(baseRow.id, {
      name: "Updated Dev",
      upiId: "dev@upi",
    });

    expect(user).toMatchObject({
      id: baseRow.id,
      name: "Updated Dev",
      upiId: "dev@upi",
    });
  });
});
