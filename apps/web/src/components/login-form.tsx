'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/supabase-auth';
import { LogIn, UserPlus, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface LoginFormProps {
  initialMode?: 'login' | 'signup';
  showModeToggle?: boolean;
}

export default function LoginForm({
  initialMode = 'login',
  showModeToggle = true,
}: LoginFormProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { signIn, signUp, signInWithGoogle, isLoading } = useAuth();

  useEffect(() => {
    // keep internal state in sync if parent changes initialMode
    setIsLogin(initialMode === 'login');
  }, [initialMode]);

  // バリデーション関数
  const validateForm = () => {
    if (!isLogin) {
      // 新規登録時のバリデーション
      if (password.length < 6) {
        toast.error('パスワードは6文字以上で入力してください。');
        return false;
      }
      if (password !== confirmPassword) {
        toast.error('パスワードが一致しません。');
        return false;
      }
      if (!agreeToTerms) {
        toast.error('利用規約・プライバシーポリシーに同意してください。');
        return false;
      }
    }
    return true;
  };

  // モード切り替え時のフォームリセット
  const handleModeToggle = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAgreeToTerms(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション実行
    if (!validateForm()) {
      return;
    }

    try {
      const success = isLogin
        ? await signIn(email, password)
        : await signUp(email, password, email.split('@')[0]);

      if (success) {
        if (!isLogin) {
          // 新規登録成功時
          toast.success('アカウントが作成されました。ログインしてください。');
          setIsLogin(true); // ログイン画面に切り替え
          setEmail(''); // フォームをリセット
          setPassword('');
          setConfirmPassword('');
          setAgreeToTerms(false);
        }
        // ログイン成功時は自動でダッシュボードに遷移する
      } else {
        toast.error(isLogin ? 'ログインに失敗しました' : '登録に失敗しました');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      // 詳細エラーメッセージを表示
      const message = error.message || (isLogin ? 'ログインに失敗しました' : '登録に失敗しました');
      toast.error(message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const success = await signInWithGoogle(!isLogin);
      if (!success) {
        toast.error(isLogin ? 'Googleログインに失敗しました' : 'Google登録に失敗しました');
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error('エラーが発生しました');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
            {isLogin ? (
              <LogIn className="w-6 h-6 text-primary" />
            ) : (
              <UserPlus className="w-6 h-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-semibold">
            {isLogin ? 'Product Base' : '新規登録'}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? 'アカウントにログインしてください'
              : '新しいアカウントを作成してください'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                  placeholder="パスワード（6文字以上）"
                />
              </div>
              {!isLogin && password.length > 0 && password.length < 6 && (
                <p className="text-sm text-destructive">パスワードは6文字以上で入力してください</p>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">パスワード確認</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10"
                    placeholder="パスワードを再入力"
                  />
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="text-sm text-destructive">パスワードが一致しません</p>
                )}
              </div>
            )}

            {!isLogin && (
              <div className="flex items-start space-x-3">
                <input
                  id="agreeToTerms"
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-input rounded"
                />
                <label htmlFor="agreeToTerms" className="text-sm text-muted-foreground">
                  <a href="/terms" className="text-primary hover:underline">
                    利用規約
                  </a>
                  および
                  <a href="/privacy" className="text-primary hover:underline">
                    プライバシーポリシー
                  </a>
                  に同意します
                </label>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? (
                    <LogIn className="w-5 h-5 mr-2" />
                  ) : (
                    <UserPlus className="w-5 h-5 mr-2" />
                  )}
                  {isLogin ? 'ログイン' : '新規登録'}
                </>
              )}
            </Button>
          </form>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-background text-muted-foreground">または</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full mt-6"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLogin ? 'Googleでログイン' : 'Googleで登録'}
          </Button>

          {showModeToggle && (
            <div className="text-center mt-6">
              {isLogin ? (
                <p className="text-sm text-muted-foreground">
                  初めての方は
                  <button
                    type="button"
                    onClick={handleModeToggle}
                    className="text-primary hover:underline font-medium mx-1"
                  >
                    新規登録
                  </button>
                  から。登録は1分、いつでも退会できます。
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  すでにアカウントをお持ちの方は
                  <button
                    type="button"
                    onClick={handleModeToggle}
                    className="text-primary hover:underline font-medium mx-1"
                  >
                    こちら
                  </button>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
