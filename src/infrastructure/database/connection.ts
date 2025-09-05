import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.SUPABASE_DATABASE_URL!

if (!connectionString) {
  throw new Error('SUPABASE_DATABASE_URL environment variable is required')
}

// Create the connection
const client = postgres(connectionString)
export const db = drizzle(client, { schema })