import { sql } from "drizzle-orm";
import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey().notNull(),
  phone: varchar("phone", { length: 15 }).unique().notNull(),
  otp_hash: varchar("otp_hash", { length: 64 }).notNull(),
  expires_at: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
  consumed_at: timestamp("consumed_at", {
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

export type OTPCodeRow = typeof otpCodes.$inferSelect;
export type NewOTPCodeRow = typeof otpCodes.$inferInsert;
