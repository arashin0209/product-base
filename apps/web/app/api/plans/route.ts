import { NextRequest } from 'next/server'
import { PlanService } from '../../../../../../src/application/plan/plan.service'
import { handleAPIError, createSuccessResponse } from '../../../../../../src/shared/errors'

const planService = new PlanService()

// プラン一覧取得
export async function GET(request: NextRequest) {
  try {
    const plans = await planService.getAvailablePlans()
    
    return Response.json(createSuccessResponse({
      plans
    }))
    
  } catch (error) {
    return handleAPIError(error)
  }
}