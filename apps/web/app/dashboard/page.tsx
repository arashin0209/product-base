'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@product-base/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@product-base/ui'
import { Textarea } from '@product-base/ui'
import { Send, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppHeader from '../../components/AppHeader'

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

interface AIUsageStats {
  currentUsage: number
  limit: number | null
  remaining: number | null
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [planInfo, setPlanInfo] = useState<UserPlanInfo | null>(null)
  const [aiUsage, setAiUsage] = useState<AIUsageStats | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([])
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
  
  // データベースから定数を動的取得
  const [constants, setConstants] = useState<{
    plans?: {FREE_PLAN_ID?: string}
    features?: {AI_REQUESTS_FEATURE_ID?: string}
  } | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchUserPlanInfo()
      fetchAiUsage()
      fetchChatHistory()
      fetchConstants()
      fetchAllPlans()
    }
  }, [user, loading, router])

  const fetchConstants = async () => {
    try {
      const response = await fetch('/api/constants')
      if (response.ok) {
        const data = await response.json()
        setConstants(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch constants:', error)
    }
  }

  const fetchAllPlans = async () => {
    try {
      const response = await fetch('/api/plans')
      if (response.ok) {
        const data = await response.json()
        setAllPlans(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error)
    }
  }

  const fetchUserPlanInfo = async () => {
    try {
      const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token)
      if (!token) return

      const response = await fetch('/api/users/me/plan', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPlanInfo(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch plan info:', error)
    }
  }

  const fetchAiUsage = async () => {
    try {
      const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token)
      if (!token) return

      const response = await fetch('/api/ai/usage', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAiUsage(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch AI usage:', error)
    }
  }

  const fetchChatHistory = async () => {
    try {
      const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token)
      if (!token) return

      const response = await fetch('/api/ai/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setChatHistory(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim() || chatLoading) return

    setChatLoading(true)
    const userMessage = chatMessage
    setChatMessage('')
    
    // Add user message to chat
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token)
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch('/api/ai/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Add AI response to chat
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.data.message }])
        // Refresh usage stats
        fetchAiUsage()
      } else {
        // Handle error
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: `エラー: ${data.error.message}` 
        }])
      }
    } catch (error) {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'エラーが発生しました。再度お試しください。' 
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // 一時的にバイパスしてチャット機能の動作確認
  const canUseAI = true // planInfo?.features?.find(f => 
  //   constants?.features && f.featureId === constants.features.AI_REQUESTS_FEATURE_ID
  // )?.enabled || false
  const hasUsageLeft = true // !aiUsage?.limit || (aiUsage.remaining && aiUsage.remaining > 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Common Component */}
      <AppHeader planInfo={planInfo} allPlans={allPlans} />

      {/* Main Content - ChatGPT Style */}
      <main className="container mx-auto max-w-4xl px-4 py-6">
        {/* Plan Info Card */}
        {planInfo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">プラン情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">現在のプラン</p>
                  <p className="text-lg font-semibold">{planInfo.displayName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ステータス</p>
                  <p className="text-sm">
                    {planInfo.subscription?.status === 'active' ? 'アクティブ' : '非アクティブ'}
                  </p>
                </div>
                {planInfo.subscription?.currentPeriodEnd && (
                  <div>
                    <p className="text-sm text-muted-foreground">次回更新日</p>
                    <p className="text-sm">
                      {new Date(planInfo.subscription.currentPeriodEnd).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                )}
              </div>
              {aiUsage && aiUsage.limit && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>AI使用状況</span>
                    <span>残り {aiUsage.remaining || 0} / {aiUsage.limit} 回</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${Math.min(((aiUsage.limit - (aiUsage.remaining || 0)) / aiUsage.limit) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Welcome Message */}
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-6">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Product Base AI</h2>
              <p className="text-muted-foreground">
                {canUseAI 
                  ? 'AI アシスタントです。何でもお聞きください！' 
                  : 'AI機能を利用するにはプランのアップグレードが必要です'
                }
              </p>
            </div>
            
            {!canUseAI && (
              <Button onClick={() => router.push('/pricing')}>
                プランを確認する
              </Button>
            )}
          </div>
        )}

        {/* Chat Messages */}
        {chatHistory.length > 0 && (
          <div className="h-[calc(100vh-300px)] overflow-y-auto mb-4">
            <div className="space-y-6">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>

                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 ml-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {user.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        {canUseAI && hasUsageLeft && (
          <div className="sticky bottom-0 bg-background/95 backdrop-blur pt-4">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              <Textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="メッセージを入力してください..."
                className="min-h-[44px] flex-1 resize-none"
                disabled={chatLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
              />
              <Button 
                type="submit" 
                disabled={!chatMessage.trim() || chatLoading}
                size="sm"
                className="h-[44px]"
              >
                {chatLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            
            {aiUsage?.limit && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                残り {aiUsage.remaining}/{aiUsage.limit} 回
              </p>
            )}
          </div>
        )}

        {/* Upgrade Prompt */}
        {(!canUseAI || !hasUsageLeft) && chatHistory.length > 0 && (
          <div className="sticky bottom-0 bg-background/95 backdrop-blur pt-4">
            <div className="text-center py-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">
                {!canUseAI 
                  ? 'AI機能を利用するにはプランのアップグレードが必要です'
                  : '今月のAI使用量の上限に達しました'
                }
              </p>
              <Button size="sm" onClick={() => router.push('/pricing')}>
                プランを確認する
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}