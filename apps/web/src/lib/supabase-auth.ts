'use client';

import { createClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/domain/user/user.entity';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// セッション情報を取得するヘルパー関数
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name?: string) => Promise<boolean>;
  signInWithGoogle: (isSignUp?: boolean) => Promise<boolean>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,

      initialize: async () => {
        set({ isLoading: true });
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.user) {
            await get().refreshUserData();
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isLoading: false });
        }
      },

      signIn: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          console.log('Attempting sign in with:', { email, password: '***' });
          console.log('Supabase URL:', supabaseUrl);
          console.log('Supabase Anon Key:', supabaseAnonKey ? 'SET' : 'NOT SET');
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          console.log('Sign in response:', { data, error });

          if (error) {
            console.error('Supabase auth error:', error);
            throw error;
          }

          if (data.user) {
            console.log('User authenticated:', data.user.email);
            await get().refreshUserData();
            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error) {
          console.error('Sign in error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      signUp: async (email: string, password: string, name?: string) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name: name || email.split('@')[0],
                plan: 'free',
              },
            },
          });

          if (error) throw error;

          if (data.user) {
            // ユーザーレコードを作成
            const response = await fetch('/api/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: data.user.email!,
                name: name || email.split('@')[0],
                planType: 'free',
                userId: data.user.id,
              }),
            });

            if (!response.ok) {
              console.error('Failed to create user record');
            }

            set({ isLoading: false });
            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error: any) {
          console.error('Sign up error:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      signInWithGoogle: async (isSignUp: boolean = false) => {
        set({ isLoading: true });
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}${isSignUp ? '?mode=signup' : ''}`,
            },
          });

          if (error) throw error;
          return true;
        } catch (error) {
          console.error('Google sign in error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      signOut: async () => {
        try {
          await supabase.auth.signOut();
          set({ user: null });
        } catch (error) {
          console.error('Sign out error:', error);
        }
      },

      refreshUserData: async () => {
        try {
          console.log('Refreshing user data...');
          const {
            data: { session },
          } = await supabase.auth.getSession();

          console.log('Current session:', session);

          if (session?.user) {
            console.log('User session found, fetching user data...');
            // ユーザー情報を取得
            const response = await fetch('/api/users/me', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            });
            console.log('User data response status:', response.status);
            
            if (response.ok) {
              const userData = await response.json();
              console.log('User data received:', userData);
              const user = new User(
                userData.id,
                userData.email,
                userData.name,
                userData.planType || 'free',
                userData.planStatus || 'active',
                userData.stripeCustomerId,
                userData.createdAt ? new Date(userData.createdAt) : undefined,
                userData.updatedAt ? new Date(userData.updatedAt) : undefined
              );
              set({ user, isLoading: false });
            } else {
              console.error('Failed to fetch user data:', response.status, response.statusText);
              set({ isLoading: false });
            }
          } else {
            console.log('No user session found');
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Refresh user data error:', error);
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'supabase-auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// 初期化
if (typeof window !== 'undefined') {
  useAuth.getState().initialize();
}
