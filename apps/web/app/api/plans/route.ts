import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import { plans, features, planFeatures } from '../../../../../src/infrastructure/database/schema'

// 動的にデータベースURLを構築
const buildDatabaseUrl = (): string => {
  const host = process.env.SUPABASE_DB_HOST
  const port = process.env.SUPABASE_DB_PORT
  const name = process.env.SUPABASE_DB_NAME
  const user = process.env.SUPABASE_DB_USER
  const password = process.env.SUPABASE_DB_PASSWORD
  
  if (!host || !port || !name || !user || !password) {
    throw new Error('Missing required database environment variables')
  }
  
  return `postgresql://${user}:${password}@${host}:${port}/${name}`
}

// Database connection
const connectionString = buildDatabaseUrl()
const client = postgres(connectionString, { prepare: false })
const db = drizzle(client)

// プラン一覧取得
export async function GET(request: NextRequest) {
  try {
    // Get all plans with their features
    const allPlans = await db
      .select({
        planId: plans.id,
        planName: plans.name,
        description: plans.description,
        priceMonthly: plans.priceMonthly,
        priceYearly: plans.priceYearly,
        stripePriceId: plans.stripePriceId,
        featureId: planFeatures.featureId,
        featureDisplayName: features.displayName,
        enabled: planFeatures.enabled,
        limitValue: planFeatures.limitValue,
      })
      .from(plans)
      .leftJoin(planFeatures, eq(plans.id, planFeatures.planId))
      .leftJoin(features, eq(planFeatures.featureId, features.id))
      .orderBy(plans.priceMonthly)

    // Group features by plan
    const plansWithFeatures = allPlans.reduce((acc, row) => {
      const planId = row.planId
      
      if (!acc[planId]) {
        acc[planId] = {
          id: row.planId,
          name: row.planName,
          description: row.description,
          priceMonthly: row.priceMonthly,
          priceYearly: row.priceYearly,
          stripePriceId: row.stripePriceId,
          features: []
        }
      }

      if (row.featureId) {
        acc[planId].features.push({
          featureId: row.featureId,
          displayName: row.featureDisplayName,
          enabled: row.enabled,
          limitValue: row.limitValue,
        })
      }

      return acc
    }, {})
    
    return NextResponse.json({
      success: true,
      data: Object.values(plansWithFeatures)
    })
    
  } catch (error) {
    console.error('Plans API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      },
      { status: 500 }
    )
  }
}