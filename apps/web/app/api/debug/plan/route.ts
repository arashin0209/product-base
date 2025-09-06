import { NextRequest } from 'next/server'
import { db } from '../../../../../../src/infrastructure/database/connection'
import { users, plans } from '../../../../../../src/infrastructure/database/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../../../lib/auth'

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    
    // ユーザーがpublic.usersテーブルに存在するか確認
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    // プラン情報を取得
    const planInfo = await db
      .select({
        planId: users.planId,
        planName: plans.name,
        displayName: plans.displayName,
      })
      .from(users)
      .leftJoin(plans, eq(users.planId, plans.id))
      .where(eq(users.id, userId))
      .limit(1)
    
    return Response.json({
      success: true,
      data: {
        userId,
        userExists: userRecord.length > 0,
        userRecord: userRecord[0] || null,
        planInfo: planInfo[0] || null
      }
    })
    
  } catch (error) {
    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }
    }, { status: 500 })
  }
}
