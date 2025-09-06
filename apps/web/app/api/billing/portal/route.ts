import { NextRequest } from 'next/server'
import { z } from 'zod'
import { stripe } from '../../../../lib/stripe'
import { db } from '../../../../../../src/infrastructure/database/connection'
import { users } from '../../../../../../src/infrastructure/database/schema'
import { handleAPIError, createSuccessResponse, APIError } from '../../../../../../src/shared/errors'
import { requireAuth } from '../../../../lib/auth'
import { eq } from 'drizzle-orm'

const BillingPortalSchema = z.object({
  return_url: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    const body = await request.json()
    const { return_url } = BillingPortalSchema.parse(body)
    
    // Get user information
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    if (!user || !user.stripeCustomerId) {
      throw new APIError('NOT_FOUND', 'Stripe顧客情報が見つかりません', 404)
    }
    
    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: return_url || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })
    
    return Response.json(createSuccessResponse({
      portal_url: session.url,
    }))
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラー',
          details: error.errors
        }
      }, { status: 400 })
    }
    
    return handleAPIError(error)
  }
}