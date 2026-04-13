import { eq } from "drizzle-orm";
import type { Database } from "@fdf/db";
import { users } from "@fdf/db";
import type { UserRow, NewUserRow } from "@fdf/db";
import { AppError } from "../errors/app-error.js";
import type { IUserRepository } from "../types/interfaces.js";
import type { UpdateUserInput } from "../validation/schemas.js";

export class UserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}

  async findByPhone(phone: string): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    return row;
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row;
  }

  async create(data: Pick<NewUserRow, "phone" | "name">): Promise<UserRow> {
    const [row] = await this.db
      .insert(users)
      .values({ phone: data.phone, name: data.name })
      .returning();

    if (!row) throw new AppError(500, "Failed to create user", "INTERNAL_ERROR");
    return row;
  }

  async update(id: string, data: UpdateUserInput): Promise<UserRow> {
    const updates: Partial<Pick<UserRow, "name" | "upi_id" | "updated_at">> = {
      updated_at: new Date(),
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.upi_id !== undefined) updates.upi_id = data.upi_id ?? null;

    const [row] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    if (!row) throw new AppError(404, "User not found", "NOT_FOUND");
    return row;
  }
}
