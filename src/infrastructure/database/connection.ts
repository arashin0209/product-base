import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from project root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Database connection
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL

console.log('DATABASE_URL from process.env:', process.env.DATABASE_URL)
console.log('SUPABASE_DATABASE_URL from process.env:', process.env.SUPABASE_DATABASE_URL)
console.log('Final connection string:', connectionString)

if (!connectionString) {
  throw new Error('DATABASE_URL or SUPABASE_DATABASE_URL environment variable is required')
}

const client = postgres(connectionString, { 
  ssl: { rejectUnauthorized: false },
  prepare: false 
})

export const db = drizzle(client, { schema })