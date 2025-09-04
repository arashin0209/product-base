'use client';

import { useAuth, getSession } from '@/lib/supabase-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, Settings, CreditCard, X, User, ChevronDown, Check, Crown, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    // プラン情報を取得
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/plans');
        const data = await response.json();
        if (data.success) {
          setPlans(data.data.plans);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      }
    };

    // サブスクリプション情報を取得
    const fetchSubscription = async () => {
      if (!user) return;
      
      try {
        const session = await getSession();
        if (!session) return;

        const response = await fetch('/api/subscriptions/me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSubscription(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      }
    };

    fetchPlans();
    fetchSubscription();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      toast.error('ログアウトに失敗しました');
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_GOLD_PRICE_ID || 'price_gold',
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/dashboard?canceled=true`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        window.location.href = data.data.url;
      } else {
        toast.error('決済セッションの作成に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  const getAccessToken = async () => {
    const session = await getSession();
    return session?.access_token || '';
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.stripeSubscriptionId) {
      toast.error('サブスクリプションが見つかりません');
      return;
    }

    try {
      const token = await getAccessToken();
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripeSubscriptionId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('サブスクリプションをキャンセルしました');
        // サブスクリプション情報を再取得
        const session = await getSession();
        if (session) {
          const subResponse = await fetch('/api/subscriptions/me', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          if (subResponse.ok) {
            const subData = await subResponse.json();
            if (subData.success) {
              setSubscription(subData.data);
            }
          }
        }
      } else {
        toast.error('キャンセルに失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast.error('エラーが発生しました');
    }
  };

  const handleManageBilling = async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      const data = await response.json();
      if (data.success) {
        window.location.href = data.data.url;
      } else {
        toast.error('請求管理ページの作成に失敗しました');
      }
    } catch (error) {
      console.error('Manage billing error:', error);
      toast.error('エラーが発生しました');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">Product Base</h1>
              <Badge variant={user.planType === 'free' ? 'secondary' : 'default'}>
                {user.planType === 'free' ? 'Free' : user.planType === 'gold' ? 'Gold' : 'Platinum'}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              {subscription && subscription.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageBilling}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  請求管理
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Avatar className="w-6 h-6 mr-2">
                      <AvatarImage src="" alt={user.name || user.email} />
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    {user.name || user.email}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    設定
                  </DropdownMenuItem>
                  <Separator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Welcome back!
            </h2>
            <p className="text-xl text-muted-foreground">
              こんにちは、{user.name || user.email}さん
            </p>
          </div>

          {/* プラン情報 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.id === user.planType ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    {plan.id === 'free' ? (
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <Zap className="w-6 h-6 text-muted-foreground" />
                      </div>
                    ) : plan.id === 'gold' ? (
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Crown className="w-6 h-6 text-yellow-600" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Crown className="w-6 h-6 text-purple-600" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                  {plan.id === user.planType && (
                    <Badge className="mt-2">現在のプラン</Badge>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 mb-6">
                    {Object.entries(plan.features).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          enabled ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Check className="w-3 h-3" />
                        </div>
                        <span className={`text-sm ${
                          enabled ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                  {plan.id !== user.planType && (
                    <Button
                      onClick={() => handleUpgrade(plan.id)}
                      className="w-full"
                      variant={plan.id === 'free' ? 'outline' : 'default'}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {plan.id === 'free' ? 'ダウングレード' : 'アップグレード'}
                    </Button>
                  )}
                  {plan.id === user.planType && subscription && subscription.status === 'active' && plan.id !== 'free' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCancelSubscription}
                      className="w-full"
                    >
                      <X className="w-4 h-4 mr-2" />
                      キャンセル
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 機能説明 */}
          <Card>
            <CardHeader>
              <CardTitle>利用可能な機能</CardTitle>
              <CardDescription>
                現在のプランで利用できる機能をご確認ください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-blue-500" />
                    基本機能
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">ユーザー登録・ログイン</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">プロフィール管理</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">基本的なダッシュボード</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg flex items-center">
                    <Crown className="w-5 h-5 mr-2 text-yellow-500" />
                    プレミアム機能
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">AI機能</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">データエクスポート</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">カスタムテーマ</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">優先サポート</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
