'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback: Starting authentication check')
        console.log('Auth callback: URL params:', searchParams.toString())
        
        // URLパラメータからエラーをチェック
        const error = searchParams.get('error')
        const errorCode = searchParams.get('error_code')
        const errorDescription = searchParams.get('error_description')
        
        if (error) {
          console.error('Auth callback error from URL:', { error, errorCode, errorDescription })
          router.push(`/login?error=${error}&error_code=${errorCode}&error_description=${errorDescription}`)
          return
        }
        
        // OAuth認証の場合は、まずURLパラメータを処理
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Auth callback session error:', sessionError)
          router.push('/login?error=auth_callback_failed')
          return
        }

        if (session?.user) {
          console.log('Auth callback: User authenticated', session.user.email)
          
          // Database Triggerで自動的にユーザーレコードが作成されるため、
          // 少し待ってからダッシュボードにリダイレクト
          console.log('Auth callback: Waiting for Database Trigger to create user record')
          setTimeout(() => {
            console.log('Auth callback: Redirecting to dashboard')
            router.push('/dashboard')
          }, 2000) // 2秒待機（Database Triggerの処理時間を考慮）
        } else {
          // セッションがない場合は、少し待ってから再試行
          console.log('Auth callback: No user session, retrying...')
          setTimeout(async () => {
            const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession()
            
            if (retryError) {
              console.error('Auth callback retry error:', retryError)
              router.push('/login?error=auth_callback_failed')
              return
            }

            if (retrySession?.user) {
              console.log('Auth callback retry: User authenticated', retrySession.user.email)
              router.push('/dashboard')
            } else {
              console.log('Auth callback retry: Still no user session')
              router.push('/login?error=no_session')
            }
          }, 1000)
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/login?error=unexpected_error')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  // 認証処理中
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">認証処理中...</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}