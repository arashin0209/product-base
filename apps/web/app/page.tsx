import Link from 'next/link'
import { Button } from '@product-base/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@product-base/ui'
import { Sparkles, Shield, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <h1 className="text-xl font-bold">Product Base</h1>
          </div>
          
          <div className="flex flex-1 items-center justify-end space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">ログイン</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">無料で始める</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mb-6">
            <Sparkles className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Product Base
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              AI を活用したSaaSアプリケーション。<br />
              簡単で直感的なインターフェースで、あなたのビジネスをサポートします。
            </p>
          </div>
          
          <div className="space-x-4">
            <Button size="lg" asChild>
              <Link href="/signup">無料で始める</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/login">ログイン</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Sparkles className="h-10 w-10 text-primary mb-2" />
              <CardTitle>AI アシスタント</CardTitle>
              <CardDescription>
                最新のAI技術を使用した高性能なチャットアシスタント
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>セキュア</CardTitle>
              <CardDescription>
                Supabaseによる安全で高速な認証システム
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-primary mb-2" />
              <CardTitle>高性能</CardTitle>
              <CardDescription>
                Next.js 15による高速でモダンなWebアプリケーション
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center bg-muted/50 rounded-lg p-12">
          <h2 className="text-3xl font-bold mb-4">今すぐ始めましょう</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            無料プランでProduct Baseを体験してください。<br />
            アップグレードはいつでも可能です。
          </p>
          <Button size="lg" asChild>
            <Link href="/signup">アカウント作成</Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Product Base. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}