import { createServerSupabaseClient } from './supabase'
import { APIError } from '../../../src/shared/errors'

export async function requireAuth(request: Request): Promise<string> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new APIError('UNAUTHORIZED', '認証が必要です', 401)
  }
  
  const token = authHeader.replace('Bearer ', '')
  const supabase = createServerSupabaseClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      throw new APIError('UNAUTHORIZED', '無効な認証トークンです', 401)
    }
    
    return user.id
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }
    throw new APIError('UNAUTHORIZED', '認証の検証に失敗しました', 401)
  }
}

export async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.replace('Bearer ', '')
  const supabase = createServerSupabaseClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return null
    }
    
    return user
  } catch {
    return null
  }
}