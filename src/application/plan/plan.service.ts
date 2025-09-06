import { db } from '../../infrastructure/database/connection'
import { plans, features, planFeatures, users, userSubscriptions, aiUsageLogs } from '../../infrastructure/database/schema'
import { eq, and, gte, sql, desc } from 'drizzle-orm'
import { constantsService } from '../constants/constants.service'

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
      // usersテーブルからplan_typeを取得
      const userResult = await db
        .select({
          planId: users.planType,
          planName: plans.name,
          displayName: plans.name, // displayNameカラムがないのでnameを使用
        })
        .from(users)
        .leftJoin(plans, eq(users.planType, plans.id))
        .where(eq(users.id, userId))
        .limit(1)

      if (!userResult.length) return null

      const user = userResult[0]

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
          eq(planFeatures.planId, user.planId || await constantsService.getDefaultPlanId())
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
      const featureConstants = await constantsService.getFeatureConstants()
      const featuresWithUsage: PlanFeature[] = planFeaturesList.map((feature: {
        featureId: string;
        displayName: string;
        enabled: boolean | null;
        limitValue: number | null;
      }) => ({
        featureId: feature.featureId,
        displayName: feature.displayName,
        enabled: feature.enabled || false,
        limitValue: feature.limitValue,
        currentUsage: feature.featureId === featureConstants.AI_REQUESTS_FEATURE_ID ? currentAiUsage : undefined,
      }))

      const defaultPlanId = await constantsService.getDefaultPlanId()

      return {
        planId: user.planId || defaultPlanId,
        planName: user.planName || 'Free',
        displayName: user.displayName || 'Free',
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
      const result = await db
        .select({
          enabled: planFeatures.enabled,
        })
        .from(users)
        .innerJoin(planFeatures, eq(planFeatures.planId, users.planType))
        .innerJoin(features, eq(features.id, planFeatures.featureId))
        .where(and(
          eq(users.id, userId),
          eq(planFeatures.featureId, featureId),
          eq(features.isActive, true)
        ))
        .limit(1)

      return result.length > 0 && result[0].enabled
    } catch (error) {
      console.error('Error checking feature access:', error)
      return false
    }
  }

  // 使用量制限チェック
  async checkUsageLimit(userId: string, featureId: string): Promise<{ allowed: boolean; current: number; limit: number | null }> {
    try {
      // 制限値を取得
      const limitResult = await db
        .select({
          limitValue: planFeatures.limitValue,
          enabled: planFeatures.enabled,
        })
        .from(users)
        .innerJoin(planFeatures, eq(planFeatures.planId, users.planType))
        .where(and(
          eq(users.id, userId),
          eq(planFeatures.featureId, featureId)
        ))
        .limit(1)

      if (!limitResult.length || !limitResult[0].enabled) {
        return { allowed: false, current: 0, limit: 0 }
      }

      const limit = limitResult[0].limitValue

      // 制限なし（無制限）の場合
      if (limit === null) {
        return { allowed: true, current: 0, limit: null }
      }

      // 現在の使用量を取得（AI機能の場合）
      const featureConstants = await constantsService.getFeatureConstants()
      if (featureId === featureConstants.AI_REQUESTS_FEATURE_ID) {
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
        plansList.map(async (plan: {
          id: string;
          name: string;
          description: string | null;
          priceMonthly: number | null;
          priceYearly: number | null;
          stripePriceId: string | null;
        }) => {
          const planFeaturesList = await db
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
            features: planFeaturesList,
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

      // usersテーブルのplanTypeを更新
      await db
        .update(users)
        .set({ 
          planType: newPlanId,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))

      return true
    } catch (error) {
      console.error('Error updating user plan:', error)
      throw new Error('プランの変更に失敗しました')
    }
  }
}