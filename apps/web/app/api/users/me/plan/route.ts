import { NextRequest } from 'next/server'
import { PlanService } from '../../../../../../../src/application/plan/plan.service'
import { handleAPIError, createSuccessResponse } from '../../../../../../../src/shared/errors'
import { requireAuth } from '../../../../lib/auth'

// ユーザーのプラン情報取得
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    
    const planService = new PlanService()
    const planInfo = await planService.getUserPlanInfo(userId)
    
    if (!planInfo) {
      return Response.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'ユーザーのプラン情報が見つかりません'
        }
      }, { status: 404 })
    }
    
    return Response.json(createSuccessResponse(planInfo))
    
  } catch (error) {
    return handleAPIError(error)
  }
}

// ユーザーのプラン変更
export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    const body = await request.json()
    
    const { planId } = body
    
    if (!planId || typeof planId !== 'string') {
      return Response.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'プランIDは必須です'
        }
      }, { status: 400 })
    }
    
    const planService = new PlanService()
    await planService.updateUserPlan(userId, planId)
    
    // 更新後のプラン情報を取得
    const updatedPlanInfo = await planService.getUserPlanInfo(userId)
    
    return Response.json(createSuccessResponse({
      message: 'プランが正常に変更されました',
      planInfo: updatedPlanInfo
    }))
    
  } catch (error) {
    return handleAPIError(error)
  }
}