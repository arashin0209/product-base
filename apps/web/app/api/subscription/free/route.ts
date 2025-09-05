import { NextRequest } from 'next/server'
import { db } from '../../../../../../src/infrastructure/database/connection'
import { users, userSubscriptions } from '../../../../../../src/infrastructure/database/schema'
import { handleAPIError, createSuccessResponse } from '../../../../../../src/shared/errors'
import { requireAuth } from '../../../lib/auth'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    
    // Update user to free plan
    await db.transaction(async (tx) => {
      // Update user's plan
      await tx
        .update(users)
        .set({ 
          planId: 'free',
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
      
      // Cancel any active subscriptions
      await tx
        .update(userSubscriptions)
        .set({ 
          status: 'canceled',
          cancelAtPeriodEnd: true,
          updatedAt: new Date()
        })
        .where(eq(userSubscriptions.userId, userId))
    })
    
    return Response.json(createSuccessResponse(
      null,
      '無料プランに変更しました'
    ))
    
  } catch (error) {
    return handleAPIError(error)
  }
}