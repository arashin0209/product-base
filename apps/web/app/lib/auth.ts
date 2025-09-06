import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export class AuthError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 401
  ) {
    super(message)
  }
}

export async function requireAuth(request: NextRequest): Promise<string> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new AuthError('UNAUTHORIZED', '認証が必要です', 401)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw new AuthError('UNAUTHORIZED', '無効な認証トークンです', 401)
  }
  
  return user.id
}