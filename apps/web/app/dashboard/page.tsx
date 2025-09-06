'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@product-base/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@product-base/ui'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchUserPlanInfo()
      fetchAiUsage()
      fetchChatHistory()
    }
  }, [user, loading, router])

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

  const canUseAI = planInfo?.features?.find(f => f.featureId === 'ai_requests')?.enabled || false
  const hasUsageLeft = !aiUsage?.limit || (aiUsage.remaining && aiUsage.remaining > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Product Base</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">こんにちは、{user.name || user.email}</span>
              <Button variant="outline" onClick={handleSignOut}>
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Plan Info Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>プラン情報</CardTitle>
              </CardHeader>
              <CardContent>
                {planInfo ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500">現在:</span>
                      <p className="font-medium">{planInfo.displayName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">ステータス:</span>
                      <p className="font-medium">
                        {planInfo.subscription?.status === 'active' ? 'アクティブ' : 'フリープラン'}
                      </p>
                    </div>
                    {aiUsage && (
                      <div>
                        <span className="text-sm text-gray-500">AI使用量:</span>
                        <p className="font-medium">
                          {aiUsage.limit 
                            ? `残り ${aiUsage.remaining}/${aiUsage.limit}回`
                            : `${aiUsage.currentUsage}回使用（無制限）`
                          }
                        </p>
                      </div>
                    )}
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={() => router.push('/pricing')}
                    >
                      プラン変更
                    </Button>
                  </div>
                ) : (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Chat */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>AI チャット</CardTitle>
                <CardDescription>
                  {canUseAI 
                    ? 'AI機能をご利用いただけます。何でもお聞きください！' 
                    : 'AI機能を利用するにはGoldプラン以上へのアップグレードが必要です。'
                  }
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                {/* Chat History */}
                <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
                  {chatHistory.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <p>チャット履歴はありません。</p>
                      {canUseAI && <p>メッセージを送信して会話を始めましょう！</p>}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatHistory.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              msg.role === 'user'
                                ? 'bg-blue-600 text-white ml-auto'
                                : 'bg-white border shadow-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Input */}
                {canUseAI && hasUsageLeft ? (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="メッセージを入力..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={chatLoading}
                    />
                    <Button 
                      type="submit" 
                      disabled={!chatMessage.trim() || chatLoading}
                      loading={chatLoading}
                    >
                      送信
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">
                      {!canUseAI 
                        ? 'AI機能を利用するにはプランのアップグレードが必要です'
                        : '今月のAI使用量の上限に達しました'
                      }
                    </p>
                    <Button onClick={() => router.push('/pricing')}>
                      プランを確認
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}