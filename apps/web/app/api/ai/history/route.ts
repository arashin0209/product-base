import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AiService } from '../../../../../../src/application/ai/ai.service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        },
        { status: 401 }
      )
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '無効な認証トークンです',
          },
        },
        { status: 401 }
      )
    }

    const aiService = new AiService()
    const history = await aiService.getChatHistory(user.id)

    return NextResponse.json({
      success: true,
      data: history,
    })
  } catch (error) {
    console.error('AI history API error:', error)
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