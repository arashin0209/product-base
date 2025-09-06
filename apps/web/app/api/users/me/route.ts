import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import { db } from '../../../../../../src/infrastructure/database/connection'
import { users } from '../../../../../../src/infrastructure/database/schema'
import { requireAuth } from '../../../lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    
    // Get user from Supabase auth
    const { data: { user: authUser } } = await supabase.auth.getUser(
      request.headers.get('authorization')?.replace('Bearer ', '') || ''
    )
    
    if (!authUser) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません'
        }
      }, { status: 404 })
    }
    
    // Get user from our database (if exists)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    return NextResponse.json({
      success: true,
      data: {
        id: authUser.id,
        email: authUser.email || '',
        name: user?.name || authUser.user_metadata?.full_name || '',
        plan_id: user?.planType || 'free',
        plan_name: user?.planType || 'free',
        stripe_customer_id: user?.stripeCustomerId || null,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at,
      }
    })
    
  } catch (error) {
    console.error('GET /api/users/me error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    const body = await request.json()
    
    const { name } = body
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({
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
    
    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        updated_at: updatedUser.updatedAt,
      }
    })
    
  } catch (error) {
    console.error('PUT /api/users/me error:', error)
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