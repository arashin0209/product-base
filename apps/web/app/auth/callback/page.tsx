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
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/login?error=auth_callback_failed')
          return
        }

        if (data.session?.user) {
          // For Google OAuth, check if user record exists, create if not
          const userResponse = await fetch('/api/users/me', {
            headers: {
              'Authorization': `Bearer ${data.session.access_token}`,
            },
          })

          if (userResponse.status === 404) {
            // User record doesn't exist, create it
            const createResponse = await fetch('/api/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: data.session.user.id,
                email: data.session.user.email,
                name: data.session.user.user_metadata?.full_name || 
                      data.session.user.user_metadata?.name || 
                      data.session.user.email?.split('@')[0] || 
                      'User',
              }),
            })

            if (!createResponse.ok) {
              console.error('Failed to create user record')
              router.push('/login?error=user_creation_failed')
              return
            }
          }

          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/login?error=unexpected_error')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

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