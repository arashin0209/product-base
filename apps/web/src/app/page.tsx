'use client';

import { useAuth } from '@/lib/supabase-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import LoginForm from '@/components/login-form';
import { Toaster } from 'react-hot-toast';

function HomeContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isSignupMode, setIsSignupMode] = useState(false);

  // URL パラメータから signup モードかどうかを判定
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'signup') {
      setIsSignupMode(true);
      // URLパラメータを削除
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('mode');
      window.history.replaceState({}, '', newUrl.pathname);
    }
  }, []);

  // 認証済みユーザーの処理
  useEffect(() => {
    if (user && !isLoading) {
      if (isSignupMode) {
        // signup モードで既存ユーザーがログインした場合
        router.push('/dashboard');
      } else {
        // 通常のログイン - 即座にリダイレクト
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router, isSignupMode]);

  // 環境変数のチェック（クライアントサイドでは常に利用可能）
  const hasEnvVars = true;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  // 未ログインユーザーにはログインフォームを表示
  return (
    <>
      <LoginForm />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">読み込み中...</div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
