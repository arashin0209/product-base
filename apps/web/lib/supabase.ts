import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client
export const createClientSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    // CI/Vercel環境では環境変数がない場合があるため、モックを返す
    if (process.env.CI || process.env.VERCEL) {
      return {} as any
    }
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Legacy export for backward compatibility
export const supabase = createClientSupabaseClient()

// Server-side client with service role key
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    // CI/Vercel環境では環境変数がない場合があるため、モックを返す
    if (process.env.CI || process.env.VERCEL) {
      return {
        auth: {
          getUser: () => Promise.resolve({ data: { user: null }, error: null })
        }
      } as any
    }
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}