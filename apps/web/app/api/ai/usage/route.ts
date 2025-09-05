import { NextRequest } from 'next/server'
import { AiService } from '../../../../../../../src/application/ai/ai.service'
import { handleAPIError, createSuccessResponse } from '../../../../../../../src/shared/errors'
import { requireAuth } from '../../../lib/auth'

const aiService = new AiService()

// AI使用量統計取得
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    
    const usageStats = await aiService.getUsageStats(userId)
    
    return Response.json(createSuccessResponse({
      usage: usageStats
    }))
    
  } catch (error) {
    return handleAPIError(error)
  }
}