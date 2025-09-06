import { NextRequest } from 'next/server'
import { db } from '../../../../../../src/infrastructure/database/connection'
import { users, userSubscriptions, plans, features, planFeatures } from '../../../../../../src/infrastructure/database/schema'
import { handleAPIError, createSuccessResponse } from '../../../../../../src/shared/errors'
import { requireAuth } from '../../../lib/auth'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    
    // Get user with plan information
    const [userWithPlan] = await db
      .select({
        userId: users.id,
        planId: users.planId,
        planName: plans.name,
      })
      .from(users)
      .innerJoin(plans, eq(users.planId, plans.id))
      .where(eq(users.id, userId))
      .limit(1)
    
    if (!userWithPlan) {
      return Response.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません'
        }
      }, { status: 404 })
    }
    
    // Get active subscription if exists
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, 'active')
      ))
      .limit(1)
    
    // Get plan features
    const featuresData = await db
      .select({
        featureId: features.id,
        featureName: features.displayName,
        enabled: planFeatures.enabled,
        limitValue: planFeatures.limitValue,
      })
      .from(features)
      .innerJoin(planFeatures, eq(features.id, planFeatures.featureId))
      .where(and(
        eq(planFeatures.planId, userWithPlan.planId),
        eq(features.isActive, true)
      ))
    
    // Format features object
    const featuresObj = featuresData.reduce((acc, feature) => {
      acc[feature.featureId] = {
        enabled: feature.enabled,
        limit_value: feature.limitValue,
      }
      return acc
    }, {} as Record<string, { enabled: boolean; limit_value?: number | null }>)
    
    // Determine subscription status
    let status: 'free' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' = 'free'
    
    if (userWithPlan.planId === 'free') {
      status = 'free'
    } else if (subscription) {
      status = subscription.status as typeof status
    } else {
      // User has paid plan but no active subscription - might be an issue
      status = 'canceled'
    }
    
    return Response.json(createSuccessResponse({
      plan_id: userWithPlan.planId,
      plan_name: userWithPlan.planName,
      status,
      subscription_id: subscription?.stripeSubscriptionId || null,
      current_period_end: subscription?.currentPeriodEnd || null,
      cancel_at_period_end: subscription?.cancelAtPeriodEnd || false,
      trial_end: subscription?.trialEnd || null,
      features: featuresObj,
    }))
    
  } catch (error) {
    return handleAPIError(error)
  }
}