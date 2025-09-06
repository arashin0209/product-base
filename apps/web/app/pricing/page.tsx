'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
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

  useEffect(() => {
    // 一時的に認証をバイパスしてテスト
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true)
      const response = await fetch('/api/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data.data || [])
      } else {
        // フォールバック用のデフォルトプラン
        setPlans([
          {
            id: 'free',
            name: '無料プラン',
            description: '基本的な機能を無料で利用',
            priceMonthly: 0,
            priceYearly: 0,
            stripePriceId: null,
            features: [
              {
                featureId: 'basic_features',
                displayName: '基本的な機能',
                enabled: true,
                limitValue: null
              }
            ],
            current: true
          },
          {
            id: 'gold',
            name: 'Goldプラン',
            description: 'AI機能と高度な機能を利用',
            priceMonthly: 980,
            priceYearly: 9800,
            stripePriceId: 'price_1S41LECirsKNr4lIr1M7MFAV',
            features: [
              {
                featureId: 'ai_requests',
                displayName: 'AI機能',
                enabled: true,
                limitValue: 1000
              }
            ],
            popular: true
          },
          {
            id: 'platinum',
            name: 'プラチナプラン',
            description: '全機能を無制限で利用',
            priceMonthly: 2980,
            priceYearly: 29800,
            stripePriceId: 'price_1S41J4CirsKNr4lIdYRmtcPP',
            features: [
              {
                featureId: 'ai_requests',
                displayName: 'AI機能',
                enabled: true,
                limitValue: null
              }
            ]
          }
        ])
      }
    } catch (error) {
      console.error('プラン取得エラー:', error)
      // エラー時もデフォルトプランを表示
      setPlans([
        {
          id: 'free',
          name: '無料プラン',
          description: '基本的な機能を無料で利用',
          priceMonthly: 0,
          priceYearly: 0,
          stripePriceId: null,
          features: [
            {
              featureId: 'basic_features',
              displayName: '基本的な機能',
              enabled: true,
              limitValue: null
            }
          ],
          current: true
        },
        {
          id: 'gold',
          name: 'Goldプラン',
          description: 'AI機能と高度な機能を利用',
          priceMonthly: 980,
          priceYearly: 9800,
          stripePriceId: 'price_1S3cBKCirsKNr4lIff9saDMa',
          features: [
            {
              featureId: 'ai_requests',
              displayName: 'AI機能',
              enabled: true,
              limitValue: 1000
            }
          ],
          popular: true
        },
        {
          id: 'platinum',
          name: 'プラチナプラン',
          description: '全機能を無制限で利用',
          priceMonthly: 2980,
          priceYearly: 29800,
          stripePriceId: 'price_1S41J4CirsKNr4lIdYRmtcPP',
          features: [
            {
              featureId: 'ai_requests',
              displayName: 'AI機能',
              enabled: true,
              limitValue: null
            }
          ]
        }
      ])
    } finally {
      setLoadingPlans(false)
    }
  }

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.id === 'free') {
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
          priceId: plan.stripePriceId,
          planId: plan.id
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
      <AppHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">プラン選択</h1>
          <p className="text-xl text-gray-600">
            あなたに最適なプランをお選びください
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular ? 'ring-2 ring-primary shadow-lg' : ''
              } ${plan.current ? 'bg-primary/5' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                    人気
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-lg">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">¥{plan.priceMonthly.toLocaleString()}</span>
                  <span className="text-gray-600">/月</span>
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
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={plan.current}
                >
                  {plan.current ? '現在のプラン' : 'プランを選択'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

      </div>
    </div>
  )
}