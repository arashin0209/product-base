import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from project root .env files
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// 動的にデータベースURLを構築
const buildDatabaseUrl = (): string => {
  // 既存のSUPABASE_DATABASE_URLが設定されている場合はそれを使用
  if (process.env.SUPABASE_DATABASE_URL) {
    return process.env.SUPABASE_DATABASE_URL
  }
  
  // 分離された環境変数から構築
  const host = process.env.SUPABASE_DB_HOST
  const port = process.env.SUPABASE_DB_PORT
  const name = process.env.SUPABASE_DB_NAME
  const user = process.env.SUPABASE_DB_USER
  const password = process.env.SUPABASE_DB_PASSWORD
  
  if (!host || !port || !name || !user || !password) {
    throw new Error('Missing required database environment variables: SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_NAME, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD')
  }
  
  // Supabaseの正しい接続URL形式を使用
  // Transaction pooler (推奨) - IPv4対応
  if (port === '6543') {
    return `postgresql://postgres.${host.split('.')[0]}:${password}@aws-1-ap-southeast-1.pooler.supabase.com:${port}/${name}`
  }
  
  // Direct connection - IPv6のみ
  if (port === '5432') {
    return `postgresql://${user}:${password}@db.${host}:${port}/${name}`
  }
  
  // デフォルトはTransaction pooler
  return `postgresql://postgres.${host.split('.')[0]}:${password}@aws-1-ap-southeast-1.pooler.supabase.com:6543/${name}`
}

// Database connection
const connectionString = buildDatabaseUrl()

// Validate the connection string format - only throw error in production build
if (process.env.NODE_ENV === 'production' && (connectionString.includes('[YOUR_DB_PASSWORD]') || connectionString.includes('[HOST]') || connectionString.includes('[PORT]'))) {
  throw new Error('Please update the database connection string with actual values in .env file')
}

// Create database client with mock handling for build testing
let client: postgres.Sql<any>
let db: any

if (connectionString.includes('[YOUR_DB_PASSWORD]') || connectionString.includes('[HOST]') || connectionString.includes('[PORT]')) {
  console.warn('Using mock database connection for build testing')
  // Create a mock client that won't actually connect during build
  client = {
    query: () => Promise.resolve({ rows: [] }),
    end: () => Promise.resolve(),
  } as any
  db = {
    select: () => ({ from: () => ({ where: () => ({ limit: () => [] }) }) }),
    insert: () => ({ into: () => ({ values: () => ({ returning: () => [] }) }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
    delete: () => ({ from: () => ({ where: () => [] }) }),
  }
} else {
  client = postgres(connectionString, { 
    ssl: { rejectUnauthorized: false },
    prepare: false 
  })
  db = drizzle(client, { schema })
}

export { db }