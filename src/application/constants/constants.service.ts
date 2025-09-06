import { db } from '../../infrastructure/database/connection'
import { plans, features } from '../../infrastructure/database/schema'
import { eq } from 'drizzle-orm'

/**
 * データベース定数管理サービス
 * ハードコードされた値をデータベースクエリで動的取得
 */

// キャッシュ用インターface
interface PlanConstants {
  FREE_PLAN_ID: string
  GOLD_PLAN_ID: string
  PLATINUM_PLAN_ID: string
  AVAILABLE_PLAN_IDS: string[]
}

interface FeatureConstants {
  AI_REQUESTS_FEATURE_ID: string
  EXPORT_CSV_FEATURE_ID: string
  CUSTOM_THEME_FEATURE_ID: string
  PRIORITY_SUPPORT_FEATURE_ID: string
  API_ACCESS_FEATURE_ID: string
  AVAILABLE_FEATURE_IDS: string[]
}

interface DatabaseConstants {
  plans: PlanConstants
  features: FeatureConstants
}

export class ConstantsService {
  private static instance: ConstantsService
  private cache: DatabaseConstants | null = null
  private cacheExpiry: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分

  private constructor() {}

  static getInstance(): ConstantsService {
    if (!ConstantsService.instance) {
      ConstantsService.instance = new ConstantsService
    }
    return ConstantsService.instance
  }

  /**
   * データベース定数を取得（キャッシュ機能付き）
   */
  async getConstants(): Promise<DatabaseConstants> {
    const now = Date.now()
    
    // キャッシュが有効な場合は返す
    if (this.cache && now < this.cacheExpiry) {
      return this.cache
    }

    try {
      // データベースから最新データを取得
      const [plansList, featuresList] = await Promise.all([
        db.select({ id: plans.id }).from(plans).where(eq(plans.active, true)),
        db.select({ id: features.id }).from(features).where(eq(features.isActive, true))
      ])

      // プランIDsを配列として抽出
      const planIds = plansList.map((p: { id: string }) => p.id)
      const featureIds = featuresList.map((f: { id: string }) => f.id)

      // 定数オブジェクト構築
      this.cache = {
        plans: {
          FREE_PLAN_ID: planIds.find((id: string) => id === 'free') || 'free',
          GOLD_PLAN_ID: planIds.find((id: string) => id === 'gold') || 'gold',
          PLATINUM_PLAN_ID: planIds.find((id: string) => id === 'platinum') || 'platinum',
          AVAILABLE_PLAN_IDS: planIds,
        },
        features: {
          AI_REQUESTS_FEATURE_ID: featureIds.find((id: string) => id === 'ai_requests') || 'ai_requests',
          EXPORT_CSV_FEATURE_ID: featureIds.find((id: string) => id === 'export_csv') || 'export_csv', 
          CUSTOM_THEME_FEATURE_ID: featureIds.find((id: string) => id === 'custom_theme') || 'custom_theme',
          PRIORITY_SUPPORT_FEATURE_ID: featureIds.find((id: string) => id === 'priority_support') || 'priority_support',
          API_ACCESS_FEATURE_ID: featureIds.find((id: string) => id === 'api_access') || 'api_access',
          AVAILABLE_FEATURE_IDS: featureIds,
        }
      }

      // キャッシュ有効期限設定
      this.cacheExpiry = now + this.CACHE_DURATION

      return this.cache

    } catch (error) {
      console.error('Failed to fetch database constants:', error)
      
      // エラー時はフォールバック値を返す
      const fallback: DatabaseConstants = {
        plans: {
          FREE_PLAN_ID: 'free',
          GOLD_PLAN_ID: 'gold', 
          PLATINUM_PLAN_ID: 'platinum',
          AVAILABLE_PLAN_IDS: ['free', 'gold', 'platinum'],
        },
        features: {
          AI_REQUESTS_FEATURE_ID: 'ai_requests',
          EXPORT_CSV_FEATURE_ID: 'export_csv',
          CUSTOM_THEME_FEATURE_ID: 'custom_theme', 
          PRIORITY_SUPPORT_FEATURE_ID: 'priority_support',
          API_ACCESS_FEATURE_ID: 'api_access',
          AVAILABLE_FEATURE_IDS: ['ai_requests', 'export_csv', 'custom_theme', 'priority_support', 'api_access'],
        }
      }

      return fallback
    }
  }

  /**
   * プラン定数のみ取得
   */
  async getPlanConstants(): Promise<PlanConstants> {
    const constants = await this.getConstants()
    return constants.plans
  }

  /**
   * 機能定数のみ取得
   */
  async getFeatureConstants(): Promise<FeatureConstants> {
    const constants = await this.getConstants()
    return constants.features
  }

  /**
   * 特定プランIDの存在チェック
   */
  async isValidPlanId(planId: string): Promise<boolean> {
    const planConstants = await this.getPlanConstants()
    return planConstants.AVAILABLE_PLAN_IDS.includes(planId)
  }

  /**
   * 特定機能IDの存在チェック
   */
  async isValidFeatureId(featureId: string): Promise<boolean> {
    const featureConstants = await this.getFeatureConstants()
    return featureConstants.AVAILABLE_FEATURE_IDS.includes(featureId)
  }

  /**
   * デフォルトプランID取得
   */
  async getDefaultPlanId(): Promise<string> {
    const planConstants = await this.getPlanConstants()
    return planConstants.FREE_PLAN_ID
  }

  /**
   * キャッシュクリア（管理用）
   */
  clearCache(): void {
    this.cache = null
    this.cacheExpiry = 0
  }
}

// シングルトンインスタンスをエクスポート
export const constantsService = ConstantsService.getInstance()