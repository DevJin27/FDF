import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema/users.js";
import * as otpSchema from "./schema/otp-codes.js";

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema: { ...schema, ...otpSchema } });
}

export type Database = ReturnType<typeof createDb>;
