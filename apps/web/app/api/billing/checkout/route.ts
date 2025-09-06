import { NextRequest } from 'next/server'
import { z } from 'zod'
import { stripe, STRIPE_PRICES } from '../../../../lib/stripe'
import { db } from '../../../../../../src/infrastructure/database/connection'
import { users } from '../../../../../../src/infrastructure/database/schema'
import { handleAPIError, createSuccessResponse, APIError } from '../../../../../../src/shared/errors'
import { requireAuth } from '../../../../lib/auth'
import { createServerSupabaseClient } from '../../../../lib/supabase'
import { eq } from 'drizzle-orm'
import { constantsService } from '../../../../../../src/application/constants/constants.service'

const CheckoutSchema = z.object({
  plan_id: z.enum(['gold', 'platinum']),
  billing_cycle: z.enum(['monthly', 'yearly']).default('monthly'),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    const body = await request.json()
    
    // 動的バリデーション
    const planConstants = await constantsService.getPlanConstants()
    const validPlanIds = planConstants.AVAILABLE_PLAN_IDS.filter(id => id !== planConstants.FREE_PLAN_ID)
    
    const DynamicCheckoutSchema = z.object({
      plan_id: z.enum(validPlanIds as [string, ...string[]]),
      billing_cycle: z.enum(['monthly', 'yearly']).default('monthly'),
      success_url: z.string().url().optional(),
      cancel_url: z.string().url().optional(),
    })
    
    const { plan_id, billing_cycle, success_url, cancel_url } = DynamicCheckoutSchema.parse(body)
    
    // Get user information
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    // Get user email from Supabase
    const supabase = createServerSupabaseClient()
    const { data: { user: authUser } } = await supabase.auth.getUser(
      request.headers.get('authorization')?.replace('Bearer ', '') || ''
    )
    
    if (!authUser?.email) {
      throw new APIError('BAD_REQUEST', 'ユーザーメールアドレスが取得できません', 400)
    }
    
    // If user doesn't exist, create one
    if (!user) {
      console.log('User not found, creating new user record for userId:', userId)
      
      // Create user record
      const [newUser] = await db
        .insert(users)
        .values({
          id: userId,
          name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
          plan_id: 'free'
        })
        .returning()
      
      user = newUser
      console.log('User created successfully:', user)
    }
    
    // Get price ID based on plan and billing cycle
    const priceId = STRIPE_PRICES[`${plan_id}_${billing_cycle}` as keyof typeof STRIPE_PRICES]
    
    if (!priceId) {
      throw new APIError('BAD_REQUEST', `価格IDが見つかりません: ${plan_id}_${billing_cycle}`, 400)
    }
    
    // Create or get Stripe customer
    let customerId = user.stripeCustomerId
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: authUser.email,
        name: user.name,
        metadata: {
          user_id: userId,
        },
      })
      
      customerId = customer.id
      
      // Update user with Stripe customer ID
      await db
        .update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, userId))
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: success_url || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: cancel_url || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_id: plan_id,
        },
        trial_period_days: 7, // 1 week free trial
      },
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      metadata: {
        user_id: userId,
        plan_id: plan_id,
      },
    })
    
    return Response.json(createSuccessResponse({
      checkout_url: session.url!,
      session_id: session.id,
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