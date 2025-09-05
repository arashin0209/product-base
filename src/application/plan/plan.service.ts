import { db } from '../../infrastructure/database/connection'
import { plans, features, planFeatures, users, userSubscriptions, aiUsageLogs } from '../../infrastructure/database/schema'
import { eq, and, gte, sql, desc } from 'drizzle-orm'

export interface UserPlanInfo {
  planId: string
  planName: string
  displayName: string
  features: PlanFeature[]
  subscription?: {
    status: string
    currentPeriodEnd?: Date
    cancelAtPeriodEnd: boolean
  }
}

export interface PlanFeature {
  featureId: string
  displayName: string
  enabled: boolean
  limitValue: number | null
  currentUsage?: number
}

export class PlanService {
  // ユーザーの現在のプラン情報を取得  
  async getUserPlanInfo(userId: string): Promise<UserPlanInfo | null> {
    try {
      // auth.usersテーブルからplan_typeを取得（既存構造）
      const userResult = await db.execute(sql`
        SELECT 
          u.plan_type as plan_id,
          p.name as plan_name,
          p.name as display_name
        FROM auth.users u
        LEFT JOIN plans p ON u.plan_type = p.id
        WHERE u.id = ${userId}
        LIMIT 1
      `)

      if (!userResult.rows.length) return null

      const user = userResult.rows[0] as { plan_id: string; plan_name: string; display_name: string }

      // プラン機能を取得
      const planFeaturesList = await db
        .select({
          featureId: features.id,
          displayName: features.displayName,
          enabled: planFeatures.enabled,
          limitValue: planFeatures.limitValue,
        })
        .from(features)
        .leftJoin(planFeatures, and(
          eq(planFeatures.featureId, features.id),
          eq(planFeatures.planId, user.planId)
        ))
        .where(eq(features.isActive, true))

      // AI使用量を取得（今月分）
      const currentMonth = new Date()
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)

      const aiUsage = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(aiUsageLogs)
        .where(and(
          eq(aiUsageLogs.userId, userId),
          gte(aiUsageLogs.createdAt, currentMonth)
        ))

      const currentAiUsage = aiUsage[0]?.count || 0

      // サブスクリプション情報を取得
      const subscription = await db
        .select({
          status: userSubscriptions.status,
          currentPeriodEnd: userSubscriptions.currentPeriodEnd,
          cancelAtPeriodEnd: userSubscriptions.cancelAtPeriodEnd,
        })
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .orderBy(desc(userSubscriptions.createdAt))
        .limit(1)

      // 機能情報に使用量を追加
      const featuresWithUsage: PlanFeature[] = planFeaturesList.map(feature => ({
        featureId: feature.featureId,
        displayName: feature.displayName,
        enabled: feature.enabled || false,
        limitValue: feature.limitValue,
        currentUsage: feature.featureId === 'ai_requests' ? currentAiUsage : undefined,
      }))

      return {
        planId: user.plan_id,
        planName: user.plan_name || '',
        displayName: user.display_name || '',
        features: featuresWithUsage,
        subscription: subscription.length ? {
          status: subscription[0].status,
          currentPeriodEnd: subscription[0].currentPeriodEnd || undefined,
          cancelAtPeriodEnd: subscription[0].cancelAtPeriodEnd,
        } : undefined,
      }

    } catch (error) {
      console.error('Error fetching user plan info:', error)
      throw new Error('プラン情報の取得に失敗しました')
    }
  }

  // 機能利用可否チェック
  async checkFeatureAccess(userId: string, featureId: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT pf.enabled
        FROM auth.users u
        INNER JOIN plan_features pf ON pf.plan_id = u.plan_type
        INNER JOIN features f ON f.id = pf.feature_id
        WHERE u.id = ${userId} 
          AND pf.feature_id = ${featureId}
          AND f.is_active = true
        LIMIT 1
      `)

      return result.rows.length > 0 && result.rows[0].enabled
    } catch (error) {
      console.error('Error checking feature access:', error)
      return false
    }
  }

  // 使用量制限チェック
  async checkUsageLimit(userId: string, featureId: string): Promise<{ allowed: boolean; current: number; limit: number | null }> {
    try {
      // 制限値を取得
      const limitResult = await db.execute(sql`
        SELECT pf.limit_value, pf.enabled
        FROM auth.users u
        INNER JOIN plan_features pf ON pf.plan_id = u.plan_type
        WHERE u.id = ${userId} AND pf.feature_id = ${featureId}
        LIMIT 1
      `)

      if (!limitResult.rows.length || !limitResult.rows[0].enabled) {
        return { allowed: false, current: 0, limit: 0 }
      }

      const limit = limitResult.rows[0].limit_value

      // 制限なし（無制限）の場合
      if (limit === null) {
        return { allowed: true, current: 0, limit: null }
      }

      // 現在の使用量を取得（AI機能の場合）
      if (featureId === 'ai_requests') {
        const currentMonth = new Date()
        currentMonth.setDate(1)
        currentMonth.setHours(0, 0, 0, 0)

        const usageResult = await db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(aiUsageLogs)
          .where(and(
            eq(aiUsageLogs.userId, userId),
            gte(aiUsageLogs.createdAt, currentMonth)
          ))

        const currentUsage = usageResult[0]?.count || 0
        return {
          allowed: currentUsage < limit,
          current: currentUsage,
          limit,
        }
      }

      // その他の機能は制限なしと判断
      return { allowed: true, current: 0, limit }

    } catch (error) {
      console.error('Error checking usage limit:', error)
      return { allowed: false, current: 0, limit: 0 }
    }
  }

  // 利用可能プラン一覧取得
  async getAvailablePlans() {
    try {
      const plansList = await db
        .select({
          id: plans.id,
          name: plans.name,
          description: plans.description,
          priceMonthly: plans.priceMonthly,
          priceYearly: plans.priceYearly,
          stripePriceId: plans.stripePriceId,
        })
        .from(plans)
        .where(eq(plans.active, true))
        .orderBy(plans.priceMonthly)

      // 各プランの機能を取得
      const plansWithFeatures = await Promise.all(
        plansList.map(async (plan) => {
          const features = await db
            .select({
              featureId: features.id,
              displayName: features.displayName,
              description: features.description,
              enabled: planFeatures.enabled,
              limitValue: planFeatures.limitValue,
            })
            .from(planFeatures)
            .innerJoin(features, eq(planFeatures.featureId, features.id))
            .where(and(
              eq(planFeatures.planId, plan.id),
              eq(features.isActive, true)
            ))

          return {
            ...plan,
            features,
          }
        })
      )

      return plansWithFeatures
    } catch (error) {
      console.error('Error fetching available plans:', error)
      throw new Error('プラン一覧の取得に失敗しました')
    }
  }

  // ユーザープラン変更
  async updateUserPlan(userId: string, newPlanId: string) {
    try {
      // プランの存在確認
      const planExists = await db
        .select({ id: plans.id })
        .from(plans)
        .where(and(eq(plans.id, newPlanId), eq(plans.active, true)))
        .limit(1)

      if (!planExists.length) {
        throw new Error('指定されたプランが存在しません')
      }

      // auth.usersテーブルのplan_typeを更新
      await db.execute(sql`
        UPDATE auth.users 
        SET plan_type = ${newPlanId}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `)

      return true
    } catch (error) {
      console.error('Error updating user plan:', error)
      throw new Error('プランの変更に失敗しました')
    }
  }
}