#!/usr/bin/env tsx
/**
 * 最適化マイグレーション実行スクリプト
 * 現在のDB状況に合わせて安全にマイグレーションを実行
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// 環境変数読み込み
dotenv.config()

// Direct Connection URLを使用（マイグレーション用）
const connectionString = process.env.SUPABASE_DIRECT_URL
if (!connectionString) {
  throw new Error('SUPABASE_DIRECT_URL environment variable is required')
}

const client = postgres(connectionString, { max: 1 })
const db = drizzle(client)

async function runOptimizedMigration() {
  try {
    console.log('🚀 最適化マイグレーション開始...')

    // 0002マイグレーションファイルを読み込み
    const migrationPath = path.join(process.cwd(), 'src/infrastructure/database/migrations/0002_optimization_complete.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    // SQLを実行
    console.log('📝 最適化マイグレーション実行中...')
    await client.unsafe(migrationSQL)

    console.log('✅ 最適化マイグレーション完了！')
    
    // 結果確認
    console.log('🔍 制約確認中...')
    const constraints = await client`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name IN ('plan_features', 'user_subscriptions', 'ai_usage_logs')
        AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
      ORDER BY tc.table_name, tc.constraint_type, kcu.column_name;
    `
    
    console.log('📊 制約確認結果:')
    console.table(constraints)

    // データ確認
    const planCheck = await client`SELECT id, name, price_monthly, stripe_price_id FROM plans ORDER BY price_monthly`
    console.log('💰 プランデータ確認:')
    console.table(planCheck)

  } catch (error) {
    console.error('❌ マイグレーション失敗:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('📚 マイグレーション処理完了')
  }
}

// 実行
runOptimizedMigration()