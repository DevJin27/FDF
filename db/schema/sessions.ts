import { sql } from "drizzle-orm";
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/users";

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    code: varchar("code", { length: 8 }).unique().notNull(),
    leader_id: uuid("leader_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    platform: varchar("platform", { length: 32 }).notNull(),
    min_order_value: numeric("min_order_value", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    deadline: timestamp("deadline", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    delivery_address: text("delivery_address").notNull(),
    total_amount_paid: numeric("total_amount_paid", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .default(0)
      .notNull(),
    created_at: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    locked_at: timestamp("locked_at", {
      withTimezone: true,
      mode: "date",
    }),
    settled_at: timestamp("settled_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => ({
    statusDeadlineIdx: index("sessions_status_deadline_idx").on(
      table.status,
      table.deadline,
    ),
  }),
);

export const sessionMembers = pgTable(
  "session_members",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
    session_id: uuid("session_id")
      .references(() => sessions.id, { onDelete: "cascade" })
      .notNull(),
    user_id: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 16 }).notNull(),
    subtotal: numeric("subtotal", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .default(0)
      .notNull(),
    payment_status: varchar("payment_status", { length: 16 })
      .default("pending")
      .notNull(),
    joined_at: timestamp("joined_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sessionUserUniqueIdx: uniqueIndex("session_members_session_user_unique").on(
      table.session_id,
      table.user_id,
    ),
    sessionJoinedAtIdx: index("session_members_session_joined_at_idx").on(
      table.session_id,
      table.joined_at,
    ),
  }),
);

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type SessionMemberRow = typeof sessionMembers.$inferSelect;
export type NewSessionMemberRow = typeof sessionMembers.$inferInsert;
