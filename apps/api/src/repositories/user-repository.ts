import { eq } from "drizzle-orm";

import { getDb } from "../lib/db";
import { users } from "../db/schema/auth";
import { AuthenticatedUser } from "../lib/domain";

export class UserRepository {
  private readonly db = getDb();

  async ensureFromAuth(user: AuthenticatedUser) {
    const existing = await this.findById(user.id);

    if (existing) {
      await this.db
        .update(users)
        .set({
          name: user.name,
          email: user.email,
          image: user.image,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      return await this.findById(user.id);
    }

    await this.db.insert(users).values({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image
    });

    return await this.findById(user.id);
  }

  async findById(userId: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  }

  async updateUpiId(userId: string, upiId: string | null) {
    await this.db
      .update(users)
      .set({
        upiId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return await this.findById(userId);
  }
}
