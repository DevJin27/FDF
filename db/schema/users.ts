import { sql } from "drizzle-orm";
import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
  phone: varchar("phone", { length: 15 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  upi_id: varchar("upi_id", { length: 100 }),
  fdf_streak: integer("fdf_streak").default(0).notNull(),
  fdf_unlocked_until: timestamp("fdf_unlocked_until", {
    withTimezone: true,
    mode: "date",
  }),
  created_at: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
