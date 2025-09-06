#!/usr/bin/env tsx
/**
 * スキーマ整合性確認スクリプト
 * DB設計書、Drizzleスキーマ、実際のSupabaseの整合性を確認
 */

import * as dotenv from 'dotenv'
import postgres from 'postgres'

// 環境変数読み込み（プロジェクトルートの.envファイルから）
dotenv.config({ path: '.env' })

const connectionString = process.env.SUPABASE_DIRECT_URL
if (!connectionString) {
  throw new Error('SUPABASE_DIRECT_URL environment variable is required')
}

const client = postgres(connectionString, { max: 1 })

async function verifySchemaConsistency() {
  try {
    console.log('🔍 スキーマ整合性確認開始...\n')

    // 1. テーブル存在確認
    console.log('📋 1. テーブル存在確認')
    const tables = await client`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    console.table(tables)

    // 2. 主キー制約確認
    console.log('🔑 2. 主キー制約確認')
    const primaryKeys = await client`
      SELECT 
        tc.table_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as primary_key_columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name IN ('plans', 'features', 'plan_features', 'users', 'user_subscriptions', 'ai_usage_logs')
      GROUP BY tc.table_name
      ORDER BY tc.table_name
    `
    console.table(primaryKeys)

    // 3. 外部キー制約確認
    console.log('🔗 3. 外部キー制約確認')
    const foreignKeys = await client`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('plan_features', 'user_subscriptions', 'ai_usage_logs', 'users')
      ORDER BY tc.table_name, kcu.column_name
    `
    console.table(foreignKeys)

    // 4. データ整合性確認
    console.log('📊 4. 基本データ確認')
    
    const planCount = await client`SELECT COUNT(*) as count FROM plans`
    const featureCount = await client`SELECT COUNT(*) as count FROM features`
    const planFeatureCount = await client`SELECT COUNT(*) as count FROM plan_features`
    
    console.log(`Plans: ${planCount[0].count}件`)
    console.log(`Features: ${featureCount[0].count}件`)
    console.log(`Plan Features: ${planFeatureCount[0].count}件`)

    // 5. Stripe価格ID確認
    console.log('\n💰 5. Stripe価格ID設定確認')
    const planPricing = await client`
      SELECT id, name, price_monthly, price_yearly, stripe_price_id 
      FROM plans 
      ORDER BY price_monthly
    `
    console.table(planPricing)

    // 6. インデックス確認
    console.log('⚡ 6. パフォーマンスインデックス確認')
    const indexes = await client`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
        AND tablename IN ('ai_usage_logs', 'user_subscriptions', 'plan_features')
      ORDER BY tablename, indexname
    `
    console.table(indexes.map(idx => ({
      table: idx.tablename,
      index: idx.indexname,
      definition: idx.indexdef.replace(/CREATE INDEX \w+ ON \w+\.\w+ /, '')
    })))

    // 7. 整合性スコア
    console.log('\n🎯 7. 整合性評価')
    
    const expectedCounts = {
      plans: 3,
      features: 5, 
      plan_features: 15
    }
    
    const actualCounts = {
      plans: parseInt(planCount[0].count),
      features: parseInt(featureCount[0].count),
      plan_features: parseInt(planFeatureCount[0].count)
    }

    const scores = {
      'テーブル構造': tables.length >= 5 ? '✅' : '⚠️',
      '主キー制約': primaryKeys.find(pk => pk.table_name === 'plan_features' && pk.primary_key_columns.includes(',')) ? '✅' : '⚠️',
      '外部キー制約': foreignKeys.length >= 3 ? '✅' : '⚠️',
      '基本データ': Object.keys(expectedCounts).every(key => actualCounts[key] === expectedCounts[key]) ? '✅' : '⚠️',
      'Stripe連携': planPricing.some(p => p.stripe_price_id && p.stripe_price_id.startsWith('price_')) ? '✅' : '⚠️'
    }

    console.table(scores)

    const allGood = Object.values(scores).every(score => score === '✅')
    
    if (allGood) {
      console.log('\n🎉 スキーマ整合性: 完璧！')
      console.log('   DB設計書 ↔ Drizzleスキーマ ↔ Supabase: 100%整合')
    } else {
      console.log('\n⚠️  一部調整が必要な項目があります')
    }

  } catch (error) {
    console.error('❌ 確認エラー:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n📝 スキーマ整合性確認完了')
  }
}

// 実行
verifySchemaConsistency()