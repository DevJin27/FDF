import { eq } from "drizzle-orm";

import type { Database } from "@/db";
import { users, type UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import type { AppUser, CreateUserInput, IUserRepository, UpdateUserInput } from "@/types";

function mapUser(row: UserRow): AppUser {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    upiId: row.upi_id ?? null,
    fdfStreak: row.fdf_streak,
    fdfUnlockedUntil: row.fdf_unlocked_until ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}

  async findByPhone(phone: string): Promise<AppUser | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    return row ? mapUser(row) : null;
  }

  async findById(id: string): Promise<AppUser | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);

    return row ? mapUser(row) : null;
  }

  async create(input: CreateUserInput): Promise<AppUser> {
    const [row] = await this.db
      .insert(users)
      .values({
        phone: input.phone,
        name: input.name,
        upi_id: input.upiId ?? null,
      })
      .returning();

    if (!row) {
      throw new AppError(500, "Unable to create user", "USER_CREATE_FAILED");
    }

    return mapUser(row);
  }

  async update(id: string, input: UpdateUserInput): Promise<AppUser> {
    if (input.name === undefined && input.upiId === undefined) {
      throw new AppError(400, "No fields provided for update", "VALIDATION_ERROR");
    }

    const updates: {
      name?: string;
      upi_id?: string | null;
      updated_at: Date;
    } = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) {
      updates.name = input.name;
    }

    if (input.upiId !== undefined) {
      updates.upi_id = input.upiId;
    }

    const [row] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    if (!row) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    return mapUser(row);
  }
}
