import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  INTERNAL_API_SECRET: z.string().min(16),
  MATCH_MINIMUM_AMOUNT: z.coerce.number().default(200),
  MATCH_WINDOW_MINUTES: z.coerce.number().default(15)
});

export type ApiEnv = z.infer<typeof envSchema>;

let cachedEnv: ApiEnv | null = null;

export function getEnv(): ApiEnv {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }

  return cachedEnv;
}
