import { NextRequest, NextResponse } from 'next/server'
import { PlanService } from '../../../../../src/application/plan/plan.service'

// プラン一覧取得
export async function GET(request: NextRequest) {
  try {
    // サービス層を使用してプラン一覧を取得
    const planService = new PlanService()
    const plans = await planService.getAvailablePlans()
    
    return NextResponse.json({
      success: true,
      data: plans
    })
    
  } catch (error) {
    console.error('Plans API error:', error)
    
    // データベース接続エラーの場合、フォールバックデータを返す
    if (error.message?.includes('CONNECT_TIMEOUT') || 
        error.message?.includes('getaddrinfo ENOTFOUND') ||
        error.message?.includes('プラン一覧の取得に失敗しました')) {
      
      console.warn('Database connection failed, returning fallback plans')
      
      // フォールバック用のプランデータ
      const fallbackPlans = [
        {
          id: 'free',
          name: 'Free',
          description: '無料プラン',
          priceMonthly: 0,
          priceYearly: 0,
          stripePriceId: null,
          features: [
            {
              featureId: 'ai_requests',
              displayName: 'AIチャット',
              description: 'AIとのチャット機能',
              enabled: true,
              limitValue: 10
            }
          ]
        },
        {
          id: 'gold',
          name: 'Gold',
          description: 'ゴールドプラン',
          priceMonthly: 1000,
          priceYearly: 10000,
          stripePriceId: null,
          features: [
            {
              featureId: 'ai_requests',
              displayName: 'AIチャット',
              description: 'AIとのチャット機能',
              enabled: true,
              limitValue: 100
            }
          ]
        },
        {
          id: 'platinum',
          name: 'Platinum',
          description: 'プラチナプラン',
          priceMonthly: 2000,
          priceYearly: 20000,
          stripePriceId: null,
          features: [
            {
              featureId: 'ai_requests',
              displayName: 'AIチャット',
              description: 'AIとのチャット機能',
              enabled: true,
              limitValue: null
            }
          ]
        }
      ]
      
      return NextResponse.json({
        success: true,
        data: fallbackPlans,
        fallback: true
      })
    }
    
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