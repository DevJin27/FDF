import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1).default('postgresql://local:local@localhost:5432/fdf'),
  DIRECT_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(12).default('dev-secret-change-me'),
  OTP_EXPIRY_SECONDS: z.coerce.number().default(120),
})

export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

// Pattern: Singleton - parse and expose environment config once.
export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env)
  }
  return cachedEnv
}
