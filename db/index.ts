import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

export type Database = NeonHttpDatabase<typeof schema>;

export function createDb(databaseUrl: string): Database {
  const client = neon(databaseUrl);
  return drizzle(client, { schema });
}
