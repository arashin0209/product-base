'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@product-base/ui'
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@product-base/ui'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@product-base/ui/components/sheet'
import { Menu, LogOut, Sparkles, User, ChevronDown, CreditCard, UserCircle, Plus, Search } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface UserPlanInfo {
  planId: string
  planName: string
  displayName: string
  features: Array<{
    featureId: string
    displayName: string
    enabled: boolean
    limitValue?: number | null
  }>
  subscription?: {
    status: string
    currentPeriodEnd?: Date
    cancelAtPeriodEnd: boolean
  }
}

interface AppHeaderProps {
  planInfo?: UserPlanInfo | null
  allPlans?: Array<{
    id: string
    name: string
    description: string
    priceMonthly: string | null
    priceYearly: string | null
    stripePriceId: string | null
    features: Array<{
      featureId: string
      displayName: string
      enabled: boolean
      limitValue: number | null
    }>
  }>
}

export default function AppHeader({ planInfo, allPlans = [] }: AppHeaderProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // プラン階層の定義（数値が大きいほど上位プラン）
  const planHierarchy: { [key: string]: number } = {
    'free': 0,
    'gold': 1,
    'platinum': 2
  }

  // 現在のプランより高いプランのみをフィルタリング
  const getUpgradeablePlans = () => {
    if (!planInfo) return allPlans.filter(plan => plan.id !== 'free')
    
    const currentPlanLevel = planHierarchy[planInfo.planId] || 0
    return allPlans.filter(plan => {
      const planLevel = planHierarchy[plan.id] || 0
      return planLevel > currentPlanLevel
    })
  }

  const upgradeablePlans = getUpgradeablePlans()
  const isPlatinumUser = planInfo?.planId === 'platinum'

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/login')
    }
  }

  const handlePlanChange = async (planId: string) => {
    if (planId === 'free') {
      // 無料プランは既に選択済み
      return
    }

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: allPlans.find(p => p.id === planId)?.stripePriceId,
          planId: planId
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
        }
      } else {
        console.error('Checkout作成エラー')
      }
    } catch (error) {
      console.error('プラン選択エラー:', error)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Left: Hamburger Menu and Plan Selection */}
        <div className="flex items-center space-x-2">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>メニュー</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* User Info */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <div>
                      <p className="font-medium">{user?.email || 'ゲストユーザー'}</p>
                      <p className="text-sm text-muted-foreground">
                        プラン: {planInfo?.displayName || '無料プラン'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      router.push('/dashboard')
                      setIsMenuOpen(false)
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    ホーム
                  </Button>
                  
                  {/* Chat Management */}
                  <div className="pl-6 space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        // 新しいチャットを開始（チャット履歴をクリア）
                        window.location.reload()
                        setIsMenuOpen(false)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      新しいチャット
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        // チャット検索機能（後で実装）
                        console.log('チャット検索')
                        setIsMenuOpen(false)
                      }}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      チャットを検索
                    </Button>
                  </div>

                  {/* Other Menu Items */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      router.push('/pricing')
                      setIsMenuOpen(false)
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    プラン設定
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      router.push('/profile')
                      setIsMenuOpen(false)
                    }}
                  >
                    <UserCircle className="h-4 w-4 mr-2" />
                    プロフィール
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      handleSignOut()
                      setIsMenuOpen(false)
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    ログアウト
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Plan Selection Dropdown - Near Hamburger Menu */}
          {!isPlatinumUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 px-2 justify-between hover:bg-transparent">
                  <span className="flex items-center text-sm font-medium">
                    {planInfo ? planInfo.displayName : 'Product Base'}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80">
                <DropdownMenuLabel>プランを選択</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {upgradeablePlans.length > 0 ? (
                  upgradeablePlans.map((plan) => (
                    <DropdownMenuItem
                      key={plan.id}
                      className="flex items-center justify-between p-4"
                      onClick={() => handlePlanChange(plan.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{plan.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {plan.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          {plan.priceMonthly && (
                            <span className="text-sm font-medium">
                              ¥{parseFloat(plan.priceMonthly).toLocaleString()}/月
                            </span>
                          )}
                          {plan.features.find(f => f.enabled) && (
                            <span className="text-xs text-muted-foreground">
                              {plan.features.filter(f => f.enabled).length}個の機能
                            </span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="ml-2">
                        アップグレード
                      </Button>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    <p className="text-sm">利用可能なアップグレードプランはありません</p>
                    <p className="text-xs mt-1">現在のプランが最高レベルです</p>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Platinum users see only the plan name without dropdown */}
          {isPlatinumUser && (
            <div className="flex items-center text-sm font-medium text-muted-foreground">
              {planInfo.displayName}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
