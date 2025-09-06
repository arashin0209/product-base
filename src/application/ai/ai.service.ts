import { db } from '../../infrastructure/database/connection'
import { aiUsageLogs } from '../../infrastructure/database/schema'
import { PlanService } from '../plan/plan.service'
import { eq, desc } from 'drizzle-orm'
import OpenAI from 'openai'
import { constantsService } from '../constants/constants.service'

export interface AiChatRequest {
  message: string
  conversationId?: string
  model?: string
}

export interface AiChatResponse {
  message: string
  conversationId?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface UsageStats {
  currentUsage: number
  limit: number | null
  remaining: number | null
}

export class AiService {
  private openai: OpenAI
  private planService: PlanService

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    this.planService = new PlanService()
  }

  // AI チャット機能
  async chat(userId: string, request: AiChatRequest): Promise<AiChatResponse> {
    try {
      // 機能利用可否チェック
      const featureConstants = await constantsService.getFeatureConstants()
      const hasAccess = await this.planService.checkFeatureAccess(userId, featureConstants.AI_REQUESTS_FEATURE_ID)
      if (!hasAccess) {
        throw new Error('AI機能は有料プランでのみ利用可能です。プランをアップグレードしてください。')
      }

      // 使用量制限チェック
      const usageCheck = await this.planService.checkUsageLimit(userId, featureConstants.AI_REQUESTS_FEATURE_ID)
      if (!usageCheck.allowed) {
        throw new Error(`AI機能の利用上限に達しました。制限: ${usageCheck.limit}回/月、現在の使用量: ${usageCheck.current}回`)
      }

      // OpenAI API呼び出し
      const response = await this.openai.chat.completions.create({
        model: request.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: request.message,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      })

      const assistantMessage = response.choices[0]?.message?.content || 'レスポンスの取得に失敗しました'
      const usage = response.usage

      // 使用量ログ記録
      if (usage) {
        await this.logUsage(userId, {
          provider: 'openai',
          model: request.model || 'gpt-4o-mini',
          tokensUsed: usage.total_tokens,
          cost: this.calculateCost('gpt-4o-mini', usage.total_tokens),
        })
      }

      return {
        message: assistantMessage,
        conversationId: request.conversationId,
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        } : undefined,
      }

    } catch (error) {
      console.error('Error in AI chat:', error)
      
      // OpenAIのエラーの場合
      if (error instanceof OpenAI.APIError) {
        throw new Error(`AI API Error: ${error.message}`)
      }

      // その他のエラーはそのまま再スロー
      throw error
    }
  }

  // 使用量統計取得
  async getUsageStats(userId: string): Promise<UsageStats> {
    try {
      const featureConstants = await constantsService.getFeatureConstants()
      const usageCheck = await this.planService.checkUsageLimit(userId, featureConstants.AI_REQUESTS_FEATURE_ID)
      
      return {
        currentUsage: usageCheck.current,
        limit: usageCheck.limit,
        remaining: usageCheck.limit ? usageCheck.limit - usageCheck.current : null,
      }

    } catch (error) {
      console.error('Error fetching usage stats:', error)
      throw new Error('使用量統計の取得に失敗しました')
    }
  }

  // 使用量ログ記録
  private async logUsage(userId: string, logData: {
    provider: string
    model: string
    tokensUsed: number
    cost: number
  }) {
    try {
      await db.insert(aiUsageLogs).values({
        userId,
        provider: logData.provider,
        model: logData.model,
        tokensUsed: logData.tokensUsed,
        cost: logData.cost.toString(),
      })
    } catch (error) {
      console.error('Error logging AI usage:', error)
      // ログ記録の失敗は致命的ではないので、エラーをスローしない
    }
  }

  // コスト計算（簡略版）
  private calculateCost(model: string, tokens: number): number {
    // GPT-4o mini の料金（2024年9月現在の概算）
    const rates: Record<string, number> = {
      'gpt-4o-mini': 0.00015 / 1000, // $0.15 per 1K tokens (input), 簡略化
      'gpt-4o': 0.003 / 1000, // $3.00 per 1K tokens (input)
    }

    const rate = rates[model] || rates['gpt-4o-mini']
    return tokens * rate
  }

  // 会話履歴取得（将来的な拡張用）
  async getChatHistory(userId: string, limit = 5) {
    try {
      // 現在はシンプルな使用量ログのみ
      // 将来的には専用の会話履歴テーブルを作成予定
      const logs = await db
        .select({
          id: aiUsageLogs.id,
          provider: aiUsageLogs.provider,
          model: aiUsageLogs.model,
          tokensUsed: aiUsageLogs.tokensUsed,
          createdAt: aiUsageLogs.createdAt,
        })
        .from(aiUsageLogs)
        .where(eq(aiUsageLogs.userId, userId))
        .orderBy(desc(aiUsageLogs.createdAt))
        .limit(limit)

      return logs
    } catch (error) {
      console.error('Error fetching chat history:', error)
      return []
    }
  }
}