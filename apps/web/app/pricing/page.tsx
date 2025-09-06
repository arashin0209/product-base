'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Button } from '@product-base/ui'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@product-base/ui'
import { Check, X } from 'lucide-react'
import AppHeader from '../../components/AppHeader'

interface Plan {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  stripePriceId: string | null
  features: Array<{
    featureId: string
    displayName: string
    enabled: boolean
    limitValue: number | null
  }>
  popular?: boolean
  current?: boolean
}

export default function PricingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [planInfo, setPlanInfo] = useState<{
    planId: string
    planName: string
    displayName: string
    features: Array<{
      featureId: string
      displayName: string
      enabled: boolean
      limitValue?: number | null
    }>
  } | null>(null)
  const [allPlans, setAllPlans] = useState<Array<{
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
  }>>([])

  useEffect(() => {
    if (!loading) {
      if (user) {
        fetchUserPlanInfo()
      } else {
        // 認証されていない場合は無料プランとして設定
        setPlanInfo({
          planId: 'free',
          planName: '無料プラン',
          displayName: '無料プラン',
          features: []
        })
        setCurrentPlanId('free')
      }
      fetchPlans()
    }
  }, [user, loading])

  const fetchUserPlanInfo = async () => {
    try {
      // Supabaseから認証トークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.log('No access token available')
        return
      }

      const response = await fetch('/api/users/me/plan', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('User plan info response:', data)
        if (data.success && data.data) {
          setCurrentPlanId(data.data.planId)
          setPlanInfo(data.data)
        }
      } else {
        console.log('User plan info response failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch user plan info:', error)
    }
  }

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true)
      const response = await fetch('/api/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data.data || [])
        setAllPlans(data.data || [])
      } else {
        console.error('プラン取得エラー:', response.status, response.statusText)
        setPlans([])
        setAllPlans([])
      }
    } catch (error) {
      console.error('プラン取得エラー:', error)
      setPlans([])
      setAllPlans([])
    } finally {
      setLoadingPlans(false)
    }
  }

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.id === 'free') {
      // 無料プランは既に選択済み
      return
    }

    if (!user) {
      router.push('/login')
      return
    }

    try {
      const session = await supabase.auth.getSession()
      console.log('Session data:', session)
      const accessToken = session.data.session?.access_token
      console.log('Access token:', accessToken)
      
      if (!accessToken) {
        console.error('No access token found')
        alert('認証エラーが発生しました。再度ログインしてください。')
        return
      }

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          plan_id: plan.id,
          billing_cycle: billingCycle,
          success_url: `${window.location.origin}/dashboard?success=true`,
          cancel_url: `${window.location.origin}/pricing?canceled=true`
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.data?.checkout_url) {
          window.location.href = data.data.checkout_url
        }
      } else {
        const errorData = await response.json()
        console.error('Checkout作成エラー:', errorData)
        alert('決済セッションの作成に失敗しました。もう一度お試しください。')
      }
    } catch (error) {
      console.error('プラン選択エラー:', error)
      alert('エラーが発生しました。もう一度お試しください。')
    }
  }

  if (loading || loadingPlans) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader planInfo={planInfo} allPlans={allPlans} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">プラン選択</h1>
          <p className="text-xl text-gray-600 mb-8">
            あなたに最適なプランをお選びください
          </p>
          
          {/* 年額/月額切り替え */}
          <div className="flex items-center justify-center space-x-4">
            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              月額
            </span>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingCycle === 'yearly' ? 'bg-primary' : 'bg-gray-200'
              }`}
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              年額
            </span>
            {billingCycle === 'yearly' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                20% お得
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.length > 0 ? (
            plans.map((plan) => {
              const isCurrentPlan = currentPlanId === plan.id
              return (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular ? 'ring-2 ring-primary shadow-lg' : ''
              } ${isCurrentPlan ? 'bg-blue-100 border-blue-300' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                    人気
                  </div>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-4 right-4">
                  <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    現在のプラン
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-lg">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    ¥{Math.floor(billingCycle === 'yearly' ? plan.priceYearly / 12 : plan.priceMonthly).toLocaleString()}
                  </span>
                  <span className="text-gray-600">/月</span>
                  {billingCycle === 'yearly' && (
                    <div className="text-sm text-gray-500 mt-1">
                      年額 ¥{Math.floor(plan.priceYearly).toLocaleString()}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      {feature.enabled ? (
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                      )}
                      <span className="text-sm">
                        {feature.displayName}
                        {feature.limitValue && ` (${feature.limitValue}回/月)`}
                        {feature.limitValue === null && feature.enabled && ' (無制限)'}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrentPlan ? (
                  <div className="w-full text-center py-2 text-gray-500 font-medium">
                    現在のプラン
                  </div>
                ) : (
                  <Button
                    className="w-full bg-black text-white hover:bg-gray-800"
                    onClick={() => handleSelectPlan(plan)}
                  >
                    プランを選択
                  </Button>
                )}
              </CardFooter>
            </Card>
              )
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-500">
                <p className="text-lg font-medium mb-2">プラン情報を読み込み中...</p>
                <p className="text-sm">しばらくお待ちください</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}