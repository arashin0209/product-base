import { NextRequest } from 'next/server'
import { db } from '../../../../../../src/infrastructure/database/connection'
import { users } from '../../../../../../src/infrastructure/database/schema'
import { handleAPIError, createSuccessResponse } from '../../../../../../src/shared/errors'
import { requireAuth } from '../../../lib/auth'
import { createServerSupabaseClient } from '../../../lib/supabase'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    
    // Get user from our database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    if (!user) {
      return Response.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません'
        }
      }, { status: 404 })
    }
    
    // Get email from Supabase auth
    const supabase = createServerSupabaseClient()
    const { data: { user: authUser } } = await supabase.auth.getUser(
      request.headers.get('authorization')?.replace('Bearer ', '') || ''
    )
    
    return Response.json(createSuccessResponse({
      id: user.id,
      email: authUser?.email || '',
      name: user.name,
      plan_id: user.planId,
      stripe_customer_id: user.stripeCustomerId,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    }))
    
  } catch (error) {
    return handleAPIError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    const body = await request.json()
    
    const { name } = body
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '名前は必須です'
        }
      }, { status: 400 })
    }
    
    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({ 
        name: name.trim(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning()
    
    return Response.json(createSuccessResponse({
      id: updatedUser.id,
      name: updatedUser.name,
      updated_at: updatedUser.updatedAt,
    }))
    
  } catch (error) {
    return handleAPIError(error)
  }
}