'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '@product-base/ui'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@product-base/ui'
import { Check, X } from 'lucide-react'

interface Plan {
  id: string
  name: string
  description: string
  price: number
  priceId: string
  features: string[]
  popular?: boolean
  current?: boolean
}

export default function PricingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchPlans()
    }
  }, [user, loading, router])

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true)
      const response = await fetch('/api/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data.plans || [])
      } else {
        // フォールバック用のデフォルトプラン
        setPlans([
          {
            id: 'free',
            name: '無料プラン',
            description: '基本的な機能を無料で利用',
            price: 0,
            priceId: '',
            features: [
              '基本的な機能',
              'サポート（メール）'
            ],
            current: true
          },
          {
            id: 'gold',
            name: 'Goldプラン',
            description: 'AI機能と高度な機能を利用',
            price: 980,
            priceId: 'price_1S3cBKCirsKNr4lIff9saDMa',
            features: [
              'AI機能（月1000回）',
              '1週間無料トライアル',
              '優先サポート',
              '高度な分析機能'
            ],
            popular: true
          },
          {
            id: 'platinum',
            name: 'プラチナプラン',
            description: '全機能を無制限で利用',
            price: 2980,
            priceId: 'price_1S41J4CirsKNr4lIdYRmtcPP',
            features: [
              'AI機能（無制限）',
              '優先サポート',
              '高性能モデル',
              'カスタム統合',
              '専任アカウントマネージャー'
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
          price: 0,
          priceId: '',
          features: [
            '基本的な機能',
            'サポート（メール）'
          ],
          current: true
        },
        {
          id: 'gold',
          name: 'Goldプラン',
          description: 'AI機能と高度な機能を利用',
          price: 980,
          priceId: 'price_1S3cBKCirsKNr4lIff9saDMa',
          features: [
            'AI機能（月1000回）',
            '1週間無料トライアル',
            '優先サポート',
            '高度な分析機能'
          ],
          popular: true
        },
        {
          id: 'platinum',
          name: 'プラチナプラン',
          description: '全機能を無制限で利用',
          price: 2980,
          priceId: 'price_1S41J4CirsKNr4lIdYRmtcPP',
          features: [
            'AI機能（無制限）',
            '優先サポート',
            '高性能モデル',
            'カスタム統合',
            '専任アカウントマネージャー'
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
          priceId: plan.priceId,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                  <span className="text-4xl font-bold">¥{plan.price.toLocaleString()}</span>
                  <span className="text-gray-600">/月</span>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
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

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            質問がありますか？お気軽にお問い合わせください。
          </p>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            ダッシュボードに戻る
          </Button>
        </div>
      </div>
    </div>
  )
}