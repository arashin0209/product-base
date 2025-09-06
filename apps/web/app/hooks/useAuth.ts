import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface AuthUser extends User {
  name?: string
  planId?: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const getSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error getting session:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      })

      if (error) {
        return { data: null, error }
      }

      // Create user record in our database
      if (data.user) {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: data.user.id,
            email: data.user.email,
            name: name,
          }),
        })

        if (!response.ok) {
          return {
            data: null,
            error: { message: 'Failed to create user record' },
          }
        }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Signup failed' },
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return { data, error }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Login failed' },
      }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      return { data, error }
    } catch (error) {
      return {
        data: null,
        error: { message: 'Google signin failed' },
      }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (!error) {
        setUser(null)
      }
      return { error }
    } catch (error) {
      return { error: { message: 'Logout failed' } }
    }
  }

  return {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }
}