import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getEnv } from "../config/env";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getEnv().DATABASE_URL
    });
  }

  return pool;
}

export function getDb() {
  if (!db) {
    db = drizzle(getPool());
  }

  return db;
}
