import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as dotenv from 'dotenv'
import { plans, features, planFeatures } from './schema'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Direct connection for seed operations
const seedClient = postgres(process.env.SUPABASE_DIRECT_URL!)
const seedDb = drizzle(seedClient, { schema: { plans, features, planFeatures } })

export async function seed() {
  try {
    console.log('Starting database seed with direct connection...')

    // Insert plans
    await seedDb.insert(plans).values([
      {
        id: 'free',
        name: 'Free Plan',
        displayName: '無料プラン',
        priceMonthly: '0.00',
        priceYearly: '0.00',
        isActive: true,
      },
      {
        id: 'gold',
        name: 'Gold Plan',
        displayName: 'ゴールドプラン',
        priceMonthly: '980.00',
        priceYearly: '9800.00',
        isActive: true,
      },
      {
        id: 'platinum',
        name: 'Platinum Plan',
        displayName: 'プラチナプラン',
        priceMonthly: '2980.00',
        priceYearly: '29800.00',
        isActive: true,
      },
    ])

    console.log('✓ Plans inserted')

    // Insert features
    await seedDb.insert(features).values([
      {
        id: 'ai_requests',
        name: 'AI Requests',
        displayName: 'AI機能',
        description: 'OpenAI/Claude/Geminiへのリクエスト機能',
        isActive: true,
      },
      {
        id: 'export_csv',
        name: 'Export CSV',
        displayName: 'CSVエクスポート',
        description: 'データのCSVエクスポート機能',
        isActive: true,
      },
      {
        id: 'custom_theme',
        name: 'Custom Theme',
        displayName: 'カスタムテーマ',
        description: 'UIテーマカスタマイズ機能',
        isActive: true,
      },
      {
        id: 'priority_support',
        name: 'Priority Support',
        displayName: '優先サポート',
        description: '優先的なカスタマーサポート',
        isActive: true,
      },
      {
        id: 'api_access',
        name: 'API Access',
        displayName: 'API アクセス',
        description: '外部APIアクセス機能',
        isActive: true,
      },
    ])

    console.log('✓ Features inserted')

    // Insert plan features
    await seedDb.insert(planFeatures).values([
      // 無料プラン
      { planId: 'free', featureId: 'ai_requests', enabled: false, limitValue: 0 },
      { planId: 'free', featureId: 'export_csv', enabled: false, limitValue: 0 },
      { planId: 'free', featureId: 'custom_theme', enabled: false, limitValue: 0 },
      { planId: 'free', featureId: 'priority_support', enabled: false, limitValue: 0 },
      { planId: 'free', featureId: 'api_access', enabled: false, limitValue: 0 },

      // ゴールドプラン
      { planId: 'gold', featureId: 'ai_requests', enabled: true, limitValue: 1000 },
      { planId: 'gold', featureId: 'export_csv', enabled: true, limitValue: null },
      { planId: 'gold', featureId: 'custom_theme', enabled: true, limitValue: null },
      { planId: 'gold', featureId: 'priority_support', enabled: false, limitValue: 0 },
      { planId: 'gold', featureId: 'api_access', enabled: false, limitValue: 0 },

      // プラチナプラン
      { planId: 'platinum', featureId: 'ai_requests', enabled: true, limitValue: null },
      { planId: 'platinum', featureId: 'export_csv', enabled: true, limitValue: null },
      { planId: 'platinum', featureId: 'custom_theme', enabled: true, limitValue: null },
      { planId: 'platinum', featureId: 'priority_support', enabled: true, limitValue: null },
      { planId: 'platinum', featureId: 'api_access', enabled: true, limitValue: null },
    ])

    console.log('✓ Plan features inserted')
    console.log('Database seed completed successfully!')

  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  } finally {
    // Close the connection
    await seedClient.end()
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}