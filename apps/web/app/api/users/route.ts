import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '../../../../../src/infrastructure/database/connection'
import { users } from '../../../../../src/infrastructure/database/schema'
import { handleAPIError, createSuccessResponse, APIError } from '../../../../../src/shared/errors'
import { eq } from 'drizzle-orm'

// Validation schema based on api-design.md with DEVELOPMENT_NOTES requirements
const CreateUserSchema = z.object({
  userId: z.string().uuid(), // REQUIRED: Supabase auth.users.id
  email: z.string().email(),
  name: z.string().min(1),
  planType: z.enum(['free', 'gold', 'platinum']).optional().default('free')
})

export async function POST(request: NextRequest) {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL)
    console.log('SUPABASE_DATABASE_URL:', process.env.SUPABASE_DATABASE_URL)
    
    const body = await request.json()
    const { userId, email, name, planType } = CreateUserSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    if (existingUser.length > 0) {
      throw new APIError('USER_EXISTS', 'ユーザーは既に存在します', 400)
    }
    
    // Create user record - using actual table structure
    const [newUser] = await db
      .insert(users)
      .values({
        id: userId, // Critical: use auth.users.id from Supabase
        email,
        name,
        planType: planType, // Will use default 'free' if not provided
        planStatus: 'active', // Will use default 'active'
      })
      .returning()
    
    return Response.json(createSuccessResponse({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      planType: newUser.planType,
      planStatus: newUser.planStatus,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
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