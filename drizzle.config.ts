import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

export default {
  schema: './src/infrastructure/database/schema.ts',
  out: './src/infrastructure/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // マイグレーション用は Direct Connection を使用
    url: process.env.SUPABASE_DIRECT_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config