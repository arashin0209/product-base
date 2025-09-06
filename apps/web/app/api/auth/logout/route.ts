import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証トークンが必要です',
          },
        },
        { status: 401 }
      )
    }

    // Create Supabase client with service role for logout
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Sign out the user
    const { error } = await supabase.auth.admin.signOut(token)

    if (error) {
      console.error('Logout error:', error)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LOGOUT_FAILED',
            message: 'ログアウトに失敗しました',
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'ログアウトしました',
    })
  } catch (error) {
    console.error('Logout API error:', error)
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