import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// Load environment variables from project root .env file
dotenv.config({ path: '.env' })

export default {
  schema: './src/infrastructure/database/schema.ts',
  out: './src/infrastructure/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // マイグレーション用は Direct Connection を使用
    url: process.env.SUPABASE_DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config