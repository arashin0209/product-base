# Product Base セットアップガイド

## 概要

Product Baseは、Next.js、Supabase、Stripe、AIサービス（OpenAI/Claude/Gemini）を組み合わせたSaaSベースアプリケーションのテンプレートです。

### アーキテクチャ
- **フロントエンド**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **バックエンド**: Next.js API Routes（サーバーレス）
- **データベース**: Supabase (PostgreSQL) + Drizzle ORM
- **認証**: Supabase Auth
- **決済**: Stripe Billing Portal
- **生成AI**: OpenAI
- **デプロイ**: Vercel
- **構成**: モノレポ（pnpm + turbo + DDD）

### プロジェクト構成
```
/apps/web              # Next.js アプリ（フロント+API）
/src                   # DDD層（domain/application/infrastructure）
/packages/ui           # Shadcn UI 共通コンポーネント
/packages/shared-utils # 共通ユーティリティ
```

### 環境構成
- **ローカル環境**: Docker（アプリのみ）+ テスト環境Supabase DB
- **テスト環境**: Vercel（GitHub連携自動デプロイ）+ テスト環境Supabase DB
- **本番環境**: Vercel（GitHub連携自動デプロイ）+ 本番環境Supabase DB

## セットアップ手順

### 1. 環境変数の設定

#### 1.1 環境変数ファイルのコピー

```bash
# プロジェクトルートで実行
cp env.sample .env.local
```

#### 1.2 環境変数の説明

`.env.local`ファイルに以下の環境変数を設定する必要があります：

| 環境変数 | 説明 | 取得先 |
|---------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトのURL | Supabaseダッシュボード |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseの匿名キー（フロント用） | Supabaseダッシュボード |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseのサービスロールキー（サーバー用） | Supabaseダッシュボード |
| `SUPABASE_DATABASE_URL` | Supabaseデータベース接続URL | Supabaseダッシュボード |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripeの公開キー | Stripeダッシュボード |
| `STRIPE_SECRET_KEY` | Stripeの秘密キー | Stripeダッシュボード |
| `STRIPE_WEBHOOK_SECRET` | StripeのWebhookシークレット | Stripeダッシュボード |
| `STRIPE_GOLD_PRICE_ID` | StripeのGoldプラン価格ID | Stripeダッシュボード |
| `STRIPE_PLATINUM_PRICE_ID` | Stripeのプラチナプラン価格ID | Stripeダッシュボード |
| `OPENAI_API_KEY` | OpenAIのAPIキー | OpenAIダッシュボード |
| `NEXT_PUBLIC_APP_URL` | アプリケーションのURL | 設定値 |
| `NODE_ENV` | 環境設定 | 設定値 |
| `JWT_SECRET` | JWT用のシークレット | 生成値 |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット | Google Cloud Console |

### 2. 必要なミドルウェアのインストール

#### 2.1 Dockerを使用したセットアップ（推奨）

**⚠️ 前提条件**: Docker設定ファイルの作成が必要です（2.3節参照）

このプロジェクトはDockerを使用した開発環境をサポートしています：

1. **Dockerのインストール**
   ```bash
   # macOS (Homebrewを使用)
   brew install --cask docker
   
   # または、Docker Desktopを公式サイトからダウンロード
   # https://www.docker.com/products/docker-desktop/
   ```

2. **Docker Composeの確認**
   ```bash
   # Docker Composeがインストールされているか確認
   docker-compose --version
   ```

3. **Docker環境での起動**
   ```bash
   # まずDocker設定ファイルが存在することを確認
   ls Dockerfile docker-compose.yml .dockerignore
   
   # プロジェクトルートで実行
   docker-compose up -d
   
   # ログを確認
   docker-compose logs -f
   ```

4. **Docker環境での開発**
   ```bash
   # コンテナ内でコマンドを実行
   docker-compose exec app pnpm install
   docker-compose exec app pnpm turbo dev
   
   # データベースマイグレーション
   docker-compose exec app npx drizzle-kit generate
   docker-compose exec app npx drizzle-kit migrate
   ```

#### 2.2 ローカル環境でのセットアップ

##### 2.2.1 パッケージマネージャーの確認

このプロジェクトは`pnpm` + `turbo`を使用したモノレポ構成です：

```bash
# pnpmがインストールされていない場合
npm install -g pnpm

# turboは package.json で管理されているので個別インストール不要
```

##### 2.2.2 依存関係のインストール

```bash
# プロジェクトルート（モノレポ全体）で実行
pnpm install

# 開発サーバーの起動
pnpm turbo dev
```

#### 2.3 Docker設定ファイルの作成

**⚠️ 重要**: 以下のDockerファイル群は現在存在しないため、手動で作成が必要です。

Dockerを使用する場合は、以下のファイルをプロジェクトルートに作成してください：

1. **Dockerfileの作成**
   **ファイル名**: `Dockerfile`（プロジェクトルートに作成）
   ```dockerfile
   # Dockerfile
   FROM node:18-alpine AS base
   
   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   
   # モノレポ構成に対応
   COPY package.json pnpm-lock.yaml* ./
   COPY apps/ ./apps/
   COPY packages/ ./packages/
   COPY src/ ./src/
   RUN corepack enable pnpm && pnpm i --frozen-lockfile
   
   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   
   # Next.js collects completely anonymous telemetry data about general usage.
   # Learn more here: https://nextjs.org/telemetry
   # Uncomment the following line in case you want to disable telemetry during the build.
   ENV NEXT_TELEMETRY_DISABLED 1
   
   # モノレポ対応のビルドコマンド
   RUN corepack enable pnpm && pnpm turbo build
   
   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app
   
   ENV NODE_ENV production
   ENV NEXT_TELEMETRY_DISABLED 1
   
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   
   COPY --from=builder /app/public ./public
   
   # Set the correct permission for prerender cache
   RUN mkdir .next
   RUN chown nextjs:nodejs .next
   
   # Automatically leverage output traces to reduce image size
   # モノレポ構成のため apps/web から Next.js ファイルをコピー
   COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
   
   USER nextjs
   
   EXPOSE 3000
   
   ENV PORT 3000
   ENV HOSTNAME "0.0.0.0"
   
   CMD ["node", "server.js"]
   ```

2. **docker-compose.ymlの作成**
   **ファイル名**: `docker-compose.yml`（プロジェクトルートに作成）
   ```yaml
   # docker-compose.yml
   # ローカル開発用（テスト環境のSupabaseに接続）
   version: '3.8'
   
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=development
       env_file:
         - .env.local
       volumes:
         - .:/app
         - /app/node_modules
         - /app/.next
       depends_on:
         - redis
       # モノレポ対応のdev コマンド
       command: pnpm turbo dev
   
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       volumes:
         - redis_data:/data
   
   volumes:
     redis_data:
   ```

3. **.dockerignoreの作成**
   **ファイル名**: `.dockerignore`（プロジェクトルートに作成）
   ```dockerignore
   # .dockerignore
   .next
   .git
   .gitignore
   README.md
   Dockerfile
   .dockerignore
   node_modules
   npm-debug.log
   .env.local
   .env.production.local
   .env.development.local
   .env.test.local
   ```

4. **ファイル作成の確認**
   上記3ファイルを作成後、以下のコマンドで存在確認を行ってください：
   ```bash
   # プロジェクトルートで実行
   ls -la Dockerfile docker-compose.yml .dockerignore
   ```
   
   **注意**: ローカル環境でもテスト環境のSupabaseに接続するため、init.sqlファイルは不要です。

#### 2.4 主要な依存関係

- **Next.js**: フロントエンド・APIフレームワーク
- **TypeScript**: 型安全性
- **Tailwind CSS**: スタイリング
- **shadcn/ui**: UIコンポーネント
- **Supabase**: 認証・データベース
- **Stripe**: 決済処理
- **Drizzle ORM**: データベースORM
- **OpenAI**: AIサービス
- **Docker**: ローカル開発用コンテナ化
- **Redis**: セッション管理・キャッシュ

### 3. 各サービスの環境変数取得手順

#### 3.1 Supabase設定

1. **Supabaseプロジェクトの作成**
   ```bash
   # PlaywrightMCPを使用してSupabaseにアクセス
   npx playwright-mcp browser navigate --url https://supabase.com
   npx playwright-mcp browser click --element "Sign in" --ref "signin-button"
   npx playwright-mcp browser fill-form --fields '[{"name": "Email", "type": "textbox", "ref": "email-input", "value": "your-email@example.com"}]'
   npx playwright-mcp browser fill-form --fields '[{"name": "Password", "type": "textbox", "ref": "password-input", "value": "your-password"}]'
   npx playwright-mcp browser click --element "Sign in" --ref "signin-submit"
   npx playwright-mcp browser click --element "New Project" --ref "new-project-button"
   npx playwright-mcp browser fill-form --fields '[{"name": "Project Name", "type": "textbox", "ref": "project-name", "value": "product-base"}]'
   npx playwright-mcp browser fill-form --fields '[{"name": "Database Password", "type": "textbox", "ref": "db-password", "value": "your-secure-password"}]'
   npx playwright-mcp browser select-option --element "Region" --ref "region-select" --values ["ap-southeast-1"]
   npx playwright-mcp browser click --element "Create new project" --ref "create-project-button"
   ```

2. **環境変数の取得**
   ```bash
   # プロジェクトダッシュボードに移動
   npx playwright-mcp browser navigate --url "https://supabase.com/dashboard/project/[PROJECT_ID]"
   
   # Settings → API に移動
   npx playwright-mcp browser click --element "Settings" --ref "settings-menu"
   npx playwright-mcp browser click --element "API" --ref "api-settings"
   
   # Project URLを取得
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=project-url]').textContent"
   # 取得したURLをNEXT_PUBLIC_SUPABASE_URLに設定
   
   # anon public keyを取得
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=anon-key]').textContent"
   # 取得したキーをNEXT_PUBLIC_SUPABASE_ANON_KEYに設定
   
   # service_role keyを取得
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=service-role-key]').textContent"
   # 取得したキーをSUPABASE_SERVICE_ROLE_KEYに設定
   ```

3. **データベース接続情報の取得**
   ```bash
   # Database → Connection Pooling に移動
   npx playwright-mcp browser click --element "Database" --ref "database-menu"
   npx playwright-mcp browser click --element "Connection Pooling" --ref "connection-pooling"
   
   # 接続文字列を取得
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=connection-string]').textContent"
   # 取得した接続文字列をSUPABASE_DATABASE_URLに設定
   # 形式: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
   ```

4. **Google認証の設定**
   ```bash
   # Authentication → Providers に移動
   npx playwright-mcp browser click --element "Authentication" --ref "auth-menu"
   npx playwright-mcp browser click --element "Providers" --ref "providers-menu"
   
   # Googleプロバイダーを有効化
   npx playwright-mcp browser click --element "Google" --ref "google-provider"
   npx playwright-mcp browser click --element "Enable Google provider" --ref "enable-google-toggle"
   ```

5. **Google OAuth認証情報の設定**
   
   **5.1 Google Cloud Consoleでの設定**
   ```bash
   # Google Cloud Consoleにアクセス
   npx playwright-mcp browser navigate --url "https://console.cloud.google.com"
   npx playwright-mcp browser click --element "Select a project" --ref "project-selector"
   npx playwright-mcp browser click --element "New Project" --ref "new-project-button"
   npx playwright-mcp browser fill-form --fields '[{"name": "Project name", "type": "textbox", "ref": "project-name", "value": "product-base-auth"}]'
   npx playwright-mcp browser click --element "Create" --ref "create-project-button"
   ```

   **5.2 OAuth同意画面の設定**
   ```bash
   # APIs & Services → OAuth consent screen に移動
   npx playwright-mcp browser navigate --url "https://console.cloud.google.com/apis/credentials/consent"
   npx playwright-mcp browser click --element "External" --ref "user-type-external"
   npx playwright-mcp browser click --element "Create" --ref "create-consent-screen"
   
   # アプリケーション情報を入力
   npx playwright-mcp browser fill-form --fields '[{"name": "App name", "type": "textbox", "ref": "app-name", "value": "Product Base"}]'
   npx playwright-mcp browser fill-form --fields '[{"name": "User support email", "type": "textbox", "ref": "support-email", "value": "your-email@example.com"}]'
   npx playwright-mcp browser fill-form --fields '[{"name": "Developer contact information", "type": "textbox", "ref": "developer-email", "value": "your-email@example.com"}]'
   npx playwright-mcp browser click --element "Save and Continue" --ref "save-consent-screen"
   ```

   **5.3 OAuth 2.0クライアントIDの作成**
   ```bash
   # APIs & Services → Credentials に移動
   npx playwright-mcp browser navigate --url "https://console.cloud.google.com/apis/credentials"
   npx playwright-mcp browser click --element "Create Credentials" --ref "create-credentials"
   npx playwright-mcp browser click --element "OAuth client ID" --ref "oauth-client-id"
   
   # アプリケーションタイプを選択
   npx playwright-mcp browser click --element "Web application" --ref "web-application"
   npx playwright-mcp browser fill-form --fields '[{"name": "Name", "type": "textbox", "ref": "client-name", "value": "Product Base Web Client"}]'
   
   # 承認済みリダイレクトURIを追加
   npx playwright-mcp browser click --element "Add URI" --ref "add-redirect-uri"
   npx playwright-mcp browser fill-form --fields '[{"name": "Authorized redirect URIs", "type": "textbox", "ref": "redirect-uri", "value": "https://[PROJECT_ID].supabase.co/auth/v1/callback"}]'
   npx playwright-mcp browser click --element "Create" --ref "create-oauth-client"
   
   # クライアントIDとクライアントシークレットを取得
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=client-id]').textContent"
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=client-secret]').textContent"
   ```

   **5.4 SupabaseでのGoogle認証設定**
   ```bash
   # Supabaseダッシュボードに戻る
   npx playwright-mcp browser navigate --url "https://supabase.com/dashboard/project/[PROJECT_ID]/auth/providers"
   
   # Google認証の設定
   npx playwright-mcp browser fill-form --fields '[{"name": "Client ID", "type": "textbox", "ref": "google-client-id", "value": "[取得したクライアントID]"}]'
   npx playwright-mcp browser fill-form --fields '[{"name": "Client Secret", "type": "textbox", "ref": "google-client-secret", "value": "[取得したクライアントシークレット]"}]'
   
   # 設定を保存
   npx playwright-mcp browser click --element "Save" --ref="save-google-config"
   ```

6. **認証設定の確認**
   ```bash
   # Authentication → Settings に移動
   npx playwright-mcp browser click --element "Authentication" --ref="auth-menu"
   npx playwright-mcp browser click --element "Settings" --ref="auth-settings"
   
   # サイトURLの設定確認
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=site-url]').value"
   # 開発環境: http://localhost:3000
   # 本番環境: https://your-domain.com
   
   # リダイレクトURLの設定確認
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=redirect-urls]').value"
   # 開発環境: http://localhost:3000/auth/callback
   # 本番環境: https://your-domain.com/auth/callback
   ```

#### 3.2 Stripe設定

1. **Stripeアカウントの作成**
   ```bash
   # PlaywrightMCPを使用してStripeにアクセス
   npx playwright-mcp browser navigate --url https://stripe.com
   npx playwright-mcp browser click --element "Sign in" --ref "signin-button"
   npx playwright-mcp browser fill-form --fields '[{"name": "Email", "type": "textbox", "ref": "email-input", "value": "your-email@example.com"}]'
   npx playwright-mcp browser fill-form --fields '[{"name": "Password", "type": "textbox", "ref": "password-input", "value": "your-password"}]'
   npx playwright-mcp browser click --element "Sign in" --ref "signin-submit"
   ```

2. **APIキーの取得**
   ```bash
   # ダッシュボードに移動
   npx playwright-mcp browser navigate --url "https://dashboard.stripe.com"
   
   # Developers → API keys に移動
   npx playwright-mcp browser click --element "Developers" --ref "developers-menu"
   npx playwright-mcp browser click --element "API keys" --ref "api-keys-menu"
   
   # Publishable keyを取得
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=publishable-key]').textContent"
   # 取得したキーをNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEYに設定
   
   # Secret keyを取得（Reveal test keyをクリックしてから）
   npx playwright-mcp browser click --element "Reveal test key" --ref "reveal-secret-key"
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=secret-key]').textContent"
   # 取得したキーをSTRIPE_SECRET_KEYに設定
   ```

3. **商品・価格の作成**
   ```bash
   # Products → Create product に移動
   npx playwright-mcp browser click --element "Products" --ref "products-menu"
   npx playwright-mcp browser click --element "Create product" --ref "create-product-button"
   
   # Goldプランを作成
   npx playwright-mcp browser fill-form --fields '[{"name": "Product name", "type": "textbox", "ref": "product-name", "value": "Gold Plan"}]'
   npx playwright-mcp browser fill-form --fields '[{"name": "Price", "type": "textbox", "ref": "price-amount", "value": "2900"}]'
   npx playwright-mcp browser select-option --element "Currency" --ref "currency-select" --values ["jpy"]
   npx playwright-mcp browser select-option --element "Billing period" --ref "billing-period" --values ["month"]
   npx playwright-mcp browser click --element "Save product" --ref "save-product"
   
   # GoldプランのPrice IDを取得
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=price-id]').textContent"
   # 取得したIDをSTRIPE_GOLD_PRICE_IDに設定
   
   # Platinumプランを作成
   npx playwright-mcp browser click --element "Create product" --ref "create-product-button"
   npx playwright-mcp browser fill-form --fields '[{"name": "Product name", "type": "textbox", "ref": "product-name", "value": "Platinum Plan"}]'
   npx playwright-mcp browser fill-form --fields '[{"name": "Price", "type": "textbox", "ref": "price-amount", "value": "5900"}]'
   npx playwright-mcp browser select-option --element "Currency" --ref "currency-select" --values ["jpy"]
   npx playwright-mcp browser select-option --element "Billing period" --ref "billing-period" --values ["month"]
   npx playwright-mcp browser click --element "Save product" --ref "save-product"
   
   # PlatinumプランのPrice IDを取得
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=price-id]').textContent"
   # 取得したIDをSTRIPE_PLATINUM_PRICE_IDに設定
   ```

4. **Webhookの設定**
   ```bash
   # Developers → Webhooks に移動
   npx playwright-mcp browser click --element "Developers" --ref "developers-menu"
   npx playwright-mcp browser click --element "Webhooks" --ref "webhooks-menu"
   npx playwright-mcp browser click --element "Add endpoint" --ref "add-endpoint-button"
   
   # エンドポイントURLを設定
   npx playwright-mcp browser fill-form --fields '[{"name": "Endpoint URL", "type": "textbox", "ref": "endpoint-url", "value": "https://your-domain.com/api/billing/webhook"}]'
   
   # イベントを選択
   npx playwright-mcp browser click --element "Select events" --ref "select-events"
   npx playwright-mcp browser click --element "customer.subscription.created" --ref "subscription-created"
   npx playwright-mcp browser click --element "customer.subscription.updated" --ref "subscription-updated"
   npx playwright-mcp browser click --element "customer.subscription.deleted" --ref "subscription-deleted"
   npx playwright-mcp browser click --element "Add events" --ref "add-events-button"
   
   # Webhookを作成
   npx playwright-mcp browser click --element "Add endpoint" --ref "create-webhook-button"
   
   # Webhook secretを取得
   npx playwright-mcp browser click --element "Reveal" --ref "reveal-webhook-secret"
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=webhook-secret]').textContent"
   # 取得したシークレットをSTRIPE_WEBHOOK_SECRETに設定
   ```

#### 3.3 OpenAI設定

1. **OpenAIアカウントの作成**
   ```bash
   # PlaywrightMCPを使用してOpenAIにアクセス
   npx playwright-mcp browser navigate --url https://openai.com
   npx playwright-mcp browser click --element "Sign in" --ref "signin-button"
   npx playwright-mcp browser fill-form --fields '[{"name": "Email", "type": "textbox", "ref": "email-input", "value": "your-email@example.com"}]'
   npx playwright-mcp browser fill-form --fields '[{"name": "Password", "type": "textbox", "ref": "password-input", "value": "your-password"}]'
   npx playwright-mcp browser click --element "Sign in" --ref "signin-submit"
   ```

2. **APIキーの取得**
   ```bash
   # API Keysページに移動
   npx playwright-mcp browser navigate --url "https://platform.openai.com/api-keys"
   
   # Create new secret keyをクリック
   npx playwright-mcp browser click --element "Create new secret key" --ref "create-api-key-button"
   
   # APIキー名を設定
   npx playwright-mcp browser fill-form --fields '[{"name": "API key name", "type": "textbox", "ref": "api-key-name", "value": "product-base-api-key"}]'
   
   # APIキーを作成
   npx playwright-mcp browser click --element "Create secret key" --ref "create-secret-key-button"
   
   # 生成されたAPIキーを取得
   npx playwright-mcp browser evaluate --function "() => document.querySelector('[data-testid=api-key-value]').textContent"
   # 取得したキーをOPENAI_API_KEYに設定
   ```


### 4. 外部サービスのAPI接続確認

#### 4.1 Supabase接続確認

```bash
# 開発サーバーを起動
pnpm dev

# ブラウザで http://localhost:3000 にアクセス
# 認証機能が正常に動作することを確認
```

#### 4.2 Stripe接続確認

1. **決済フローのテスト**
   - テストモードで決済フローを実行
   - Stripeダッシュボードでテスト決済が記録されることを確認

2. **Webhookのテスト**
   - Stripe CLIを使用してローカルでWebhookをテスト
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```

#### 4.3 OpenAI接続確認

```bash
# OpenAIのAPIエンドポイントをテスト
curl -X POST http://localhost:3000/api/ai/openai \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, AI!"}'
```

#### 4.4 テストデータを使用した動作確認（PlaywrightMCP）

1. **開発サーバーの起動**
   ```bash
   # 開発サーバーを起動
   pnpm dev
   ```

2. **ブラウザでの動作確認**
   ```bash
   # アプリケーションにアクセス
   npx playwright-mcp browser navigate --url "http://localhost:3000"
   
   # ページが正常に読み込まれることを確認
   npx playwright-mcp browser evaluate --function "() => document.title"
   ```

3. **認証機能のテスト**
   ```bash
   # ログイン画面にアクセス
   npx playwright-mcp browser navigate --url "http://localhost:3000/login"
   
   # ログインフォームの存在確認
   npx playwright-mcp browser evaluate --function "() => {
     const emailInput = document.querySelector('input[type=\"email\"]');
     const passwordInput = document.querySelector('input[type=\"password\"]');
     const submitButton = document.querySelector('button[type=\"submit\"]');
     const googleButton = document.querySelector('[data-testid=\"google-signin-button\"]');
     return {
       hasEmailInput: !!emailInput,
       hasPasswordInput: !!passwordInput,
       hasSubmitButton: !!submitButton,
       hasGoogleButton: !!googleButton
     };
   }"
   
   # Google認証ボタンのテスト
   npx playwright-mcp browser click --element "Googleでサインイン" --ref "google-signin-button"
   
   # Google認証画面へのリダイレクト確認
   npx playwright-mcp browser evaluate --function "() => {
     return {
       currentUrl: window.location.href,
       isGoogleAuthPage: window.location.href.includes('accounts.google.com')
     };
   }"
   ```

4. **ダッシュボード機能のテスト**
   ```bash
   # ダッシュボードにアクセス（認証が必要な場合）
   npx playwright-mcp browser navigate --url "http://localhost:3000/dashboard"
   
   # ユーザー情報の表示確認
   npx playwright-mcp browser evaluate --function "() => {
     const userInfo = document.querySelector('[data-testid=\"user-info\"]');
     const planInfo = document.querySelector('[data-testid=\"plan-info\"]');
     return {
       hasUserInfo: !!userInfo,
       hasPlanInfo: !!planInfo,
       userInfoText: userInfo?.textContent || '',
       planInfoText: planInfo?.textContent || ''
     };
   }"
   ```

5. **API エンドポイントのテスト**
   ```bash
   # サブスクリプション状態取得APIのテスト
   npx playwright-mcp browser evaluate --function "async () => {
     try {
       const response = await fetch('/api/subscription/status', {
         method: 'GET',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': 'Bearer test-token' // テスト用トークン
         }
       });
       const data = await response.json();
       return {
         status: response.status,
         data: data
       };
     } catch (error) {
       return { error: error.message };
     }
   }"
   
   # ユーザー情報取得APIのテスト
   npx playwright-mcp browser evaluate --function "async () => {
     try {
       const response = await fetch('/api/users/me', {
         method: 'GET',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': 'Bearer test-token'
         }
       });
       const data = await response.json();
       return {
         status: response.status,
         data: data
       };
     } catch (error) {
       return { error: error.message };
     }
   }"
   ```

6. **プラン機能のテスト**
   ```bash
   # プラン選択画面のテスト
   npx playwright-mcp browser navigate --url "http://localhost:3000/plans"
   
   # プランカードの表示確認
   npx playwright-mcp browser evaluate --function "() => {
     const planCards = document.querySelectorAll('[data-testid=\"plan-card\"]');
     const freePlan = document.querySelector('[data-testid=\"plan-free\"]');
     const goldPlan = document.querySelector('[data-testid=\"plan-gold\"]');
     const platinumPlan = document.querySelector('[data-testid=\"plan-platinum\"]');
     
     return {
       totalPlans: planCards.length,
       hasFreePlan: !!freePlan,
       hasGoldPlan: !!goldPlan,
       hasPlatinumPlan: !!platinumPlan,
       planDetails: Array.from(planCards).map(card => ({
         name: card.querySelector('[data-testid=\"plan-name\"]')?.textContent,
         price: card.querySelector('[data-testid=\"plan-price\"]')?.textContent,
         features: Array.from(card.querySelectorAll('[data-testid=\"plan-feature\"]')).map(f => f.textContent)
       }))
     };
   }"
   ```

7. **AI機能のテスト**
   ```bash
   # AIチャット画面のテスト
   npx playwright-mcp browser navigate --url "http://localhost:3000/ai-chat"
   
   # AI機能の利用可否確認
   npx playwright-mcp browser evaluate --function "() => {
     const chatInput = document.querySelector('[data-testid=\"chat-input\"]');
     const sendButton = document.querySelector('[data-testid=\"send-button\"]');
     const usageInfo = document.querySelector('[data-testid=\"usage-info\"]');
     const upgradeNotice = document.querySelector('[data-testid=\"upgrade-notice\"]');
     
     return {
       hasChatInput: !!chatInput,
       hasSendButton: !!sendButton,
       hasUsageInfo: !!usageInfo,
       hasUpgradeNotice: !!upgradeNotice,
       isEnabled: !upgradeNotice && !!chatInput
     };
   }"
   ```

8. **エラーハンドリングのテスト**
   ```bash
   # 存在しないページへのアクセステスト
   npx playwright-mcp browser navigate --url "http://localhost:3000/non-existent-page"
   
   # 404ページの表示確認
   npx playwright-mcp browser evaluate --function "() => {
     const errorMessage = document.querySelector('[data-testid=\"error-message\"]');
     const backButton = document.querySelector('[data-testid=\"back-button\"]');
     
     return {
       hasErrorMessage: !!errorMessage,
       hasBackButton: !!backButton,
       errorText: errorMessage?.textContent || ''
     };
   }"
   ```

9. **レスポンシブデザインのテスト**
   ```bash
   # モバイル表示でのテスト
   npx playwright-mcp browser resize --width 375 --height 667
   npx playwright-mcp browser navigate --url "http://localhost:3000"
   
   # モバイル表示での要素確認
   npx playwright-mcp browser evaluate --function "() => {
     const hamburgerMenu = document.querySelector('[data-testid=\"hamburger-menu\"]');
     const mobileNav = document.querySelector('[data-testid=\"mobile-nav\"]');
     
     return {
       hasHamburgerMenu: !!hamburgerMenu,
       hasMobileNav: !!mobileNav,
       isResponsive: window.innerWidth <= 768
     };
   }"
   
   # デスクトップ表示に戻す
   npx playwright-mcp browser resize --width 1920 --height 1080
   ```

10. **テスト結果の確認**
    ```bash
    # コンソールエラーの確認
    npx playwright-mcp browser console-messages
    
    # ネットワークリクエストの確認
    npx playwright-mcp browser network-requests
    
    # 最終的な動作確認結果の取得
    npx playwright-mcp browser evaluate --function "() => {
      return {
        pageTitle: document.title,
        currentUrl: window.location.href,
        hasErrors: document.querySelectorAll('.error').length > 0,
        hasWarnings: document.querySelectorAll('.warning').length > 0,
        loadedSuccessfully: document.readyState === 'complete'
      };
    }"
    ```

### 5. データベースのセットアップ

#### 5.1 Supabaseでのテーブル作成

1. **Supabase SQL Editorにアクセス**
   ```bash
   # PlaywrightMCPを使用してSupabase SQL Editorにアクセス
   npx playwright-mcp browser navigate --url "https://supabase.com/dashboard/project/[PROJECT_ID]/sql"
   ```

2. **基本テーブルの作成**
   ```sql
   -- plans テーブルの作成
   CREATE TABLE plans (
       id VARCHAR(50) PRIMARY KEY,
       name VARCHAR(100) NOT NULL,
       display_name VARCHAR(100) NOT NULL,
       price_monthly DECIMAL(10,2),
       price_yearly DECIMAL(10,2),
       stripe_price_id_monthly VARCHAR(100),
       stripe_price_id_yearly VARCHAR(100),
       is_active BOOLEAN NOT NULL DEFAULT true,
       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
   );

   -- features テーブルの作成
   CREATE TABLE features (
       id VARCHAR(50) PRIMARY KEY,
       name VARCHAR(100) NOT NULL,
       display_name VARCHAR(100) NOT NULL,
       description TEXT,
       is_active BOOLEAN NOT NULL DEFAULT true,
       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
   );

   -- plan_features テーブルの作成
   CREATE TABLE plan_features (
       plan_id VARCHAR(50),
       feature_id VARCHAR(50),
       enabled BOOLEAN NOT NULL DEFAULT false,
       limit_value INTEGER,
       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (plan_id, feature_id),
       FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
       FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
   );

   -- users テーブルの作成
   CREATE TABLE users (
       id UUID PRIMARY KEY,
       name VARCHAR(100) NOT NULL,
       plan_id VARCHAR(50) NOT NULL DEFAULT 'free',
       stripe_customer_id VARCHAR(100),
       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
       FOREIGN KEY (plan_id) REFERENCES plans(id)
   );

   -- user_subscriptions テーブルの作成
   CREATE TABLE user_subscriptions (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL,
       plan_id VARCHAR(50) NOT NULL,
       stripe_subscription_id VARCHAR(100) UNIQUE,
       status VARCHAR(20) NOT NULL,
       trial_start TIMESTAMPTZ,
       trial_end TIMESTAMPTZ,
       current_period_start TIMESTAMPTZ,
       current_period_end TIMESTAMPTZ,
       cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       FOREIGN KEY (plan_id) REFERENCES plans(id),
       CHECK (status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'))
   );

   -- ai_usage_logs テーブルの作成
   CREATE TABLE ai_usage_logs (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL,
       provider VARCHAR(20) NOT NULL,
       model VARCHAR(50),
       tokens_used INTEGER,
       cost DECIMAL(10,4),
       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       CHECK (provider IN ('openai', 'claude', 'gemini'))
   );
   ```

3. **インデックスの作成**
   ```sql
   -- パフォーマンス向上のためのインデックス
   CREATE INDEX idx_users_plan_id ON users(plan_id);
   CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
   CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
   CREATE INDEX idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
   CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
   CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
   CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
   CREATE INDEX idx_ai_usage_logs_provider ON ai_usage_logs(provider);
   ```

4. **初期データの投入**
   ```sql
   -- プランデータの投入
   INSERT INTO plans (id, name, display_name, price_monthly, price_yearly, is_active) VALUES
   ('free', 'Free Plan', '無料プラン', 0.00, 0.00, true),
   ('gold', 'Gold Plan', 'ゴールドプラン', 2900.00, 29000.00, true),
   ('platinum', 'Platinum Plan', 'プラチナプラン', 5900.00, 59000.00, true);

   -- 機能データの投入
   INSERT INTO features (id, name, display_name, description, is_active) VALUES
   ('ai_requests', 'AI Requests', 'AI機能', 'OpenAIへのリクエスト機能', true),
   ('export_csv', 'Export CSV', 'CSVエクスポート', 'データのCSVエクスポート機能', true),
   ('custom_theme', 'Custom Theme', 'カスタムテーマ', 'UIテーマカスタマイズ機能', true),
   ('priority_support', 'Priority Support', '優先サポート', '優先的なカスタマーサポート', true),
   ('api_access', 'API Access', 'API アクセス', '外部APIアクセス機能', true);

   -- プラン機能関連データの投入
   INSERT INTO plan_features (plan_id, feature_id, enabled, limit_value) VALUES
   -- 無料プラン
   ('free', 'ai_requests', false, 0),
   ('free', 'export_csv', false, 0),
   ('free', 'custom_theme', false, 0),
   ('free', 'priority_support', false, 0),
   ('free', 'api_access', false, 0),
   
   -- ゴールドプラン
   ('gold', 'ai_requests', true, 1000),
   ('gold', 'export_csv', true, NULL),
   ('gold', 'custom_theme', true, NULL),
   ('gold', 'priority_support', false, 0),
   ('gold', 'api_access', false, 0),
   
   -- プラチナプラン
   ('platinum', 'ai_requests', true, NULL),
   ('platinum', 'export_csv', true, NULL),
   ('platinum', 'custom_theme', true, NULL),
   ('platinum', 'priority_support', true, NULL),
   ('platinum', 'api_access', true, NULL);
   ```

5. **Row Level Security (RLS) の設定**
   ```sql
   -- RLSの有効化
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

   -- ユーザーは自分のレコードのみ参照・更新可能
   CREATE POLICY "users_select_own" ON users
       FOR SELECT USING (auth.uid() = id);
   CREATE POLICY "users_update_own" ON users
       FOR UPDATE USING (auth.uid() = id);

   CREATE POLICY "user_subscriptions_select_own" ON user_subscriptions
       FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "ai_usage_logs_select_own" ON ai_usage_logs
       FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "ai_usage_logs_insert_own" ON ai_usage_logs
       FOR INSERT WITH CHECK (auth.uid() = user_id);
   ```

6. **更新日時自動更新トリガーの設定**
   ```sql
   -- 更新日時自動更新関数
   CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
       NEW.updated_at = CURRENT_TIMESTAMP;
       RETURN NEW;
   END;
   $$ language 'plpgsql';

   -- 各テーブルにトリガー設定
   CREATE TRIGGER update_users_updated_at 
       BEFORE UPDATE ON users 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

   CREATE TRIGGER update_plans_updated_at 
       BEFORE UPDATE ON plans 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

   CREATE TRIGGER update_plan_features_updated_at 
       BEFORE UPDATE ON plan_features 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

   CREATE TRIGGER update_user_subscriptions_updated_at 
       BEFORE UPDATE ON user_subscriptions 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   ```

#### 5.2 Drizzle ORMの設定

```bash
# マイグレーションの生成
npx drizzle-kit generate

# マイグレーションの実行
npx drizzle-kit migrate
```

#### 5.3 初期データの投入

```bash
# 必要に応じて初期データを投入
npx drizzle-kit seed
```

#### 5.4 テストデータの投入（Seeder）

1. **テストデータ用SQLファイルの作成**
   ```bash
   # テストデータ用ディレクトリを作成
   mkdir -p ./seeds
   
   # テストデータSQLファイルを作成
   cat > ./seeds/test-data.sql << 'EOF'
   -- テストユーザーデータの投入
   INSERT INTO users (id, name, plan_id, stripe_customer_id) VALUES
   ('11111111-1111-1111-1111-111111111111', 'Test User - Free', 'free', NULL),
   ('22222222-2222-2222-2222-222222222222', 'Test User - Gold Active', 'gold', 'cus_test_gold'),
   ('33333333-3333-3333-3333-333333333333', 'Test User - Platinum Trialing', 'platinum', 'cus_test_platinum'),
   ('44444444-4444-4444-4444-444444444444', 'Test User - Gold Cancel', 'gold', 'cus_test_gold_cancel'),
   ('55555555-5555-5555-5555-555555555555', 'Test User - Gold Past Due', 'gold', 'cus_test_gold_past_due'),
   ('66666666-6666-6666-6666-666666666666', 'Test User - Platinum Canceled', 'platinum', 'cus_test_platinum_canceled'),
   ('77777777-7777-7777-7777-777777777777', 'Valid User', 'free', NULL),
   ('88888888-8888-8888-8888-888888888888', 'Invalid User', 'gold', NULL);

   -- 各ステータスのサブスクリプションテストデータ
   INSERT INTO user_subscriptions (user_id, plan_id, stripe_subscription_id, status, trial_start, trial_end, current_period_start, current_period_end, cancel_at_period_end) VALUES
   -- アクティブ（継続予定）
   ('22222222-2222-2222-2222-222222222222', 'gold', 'sub_test_gold_active', 'active', NULL, NULL, '2024-01-01 00:00:00+00', '2024-02-01 00:00:00+00', false),
   -- トライアル中（継続予定）
   ('33333333-3333-3333-3333-333333333333', 'platinum', 'sub_test_platinum_trialing', 'trialing', '2024-01-15 00:00:00+00', '2024-01-22 00:00:00+00', '2024-01-15 00:00:00+00', '2024-02-15 00:00:00+00', false),
   -- アクティブ（キャンセル予定）
   ('44444444-4444-4444-4444-444444444444', 'gold', 'sub_test_gold_cancel', 'active', NULL, NULL, '2024-01-01 00:00:00+00', '2024-02-01 00:00:00+00', true),
   -- 支払い失敗
   ('55555555-5555-5555-5555-555555555555', 'gold', 'sub_test_gold_past_due', 'past_due', NULL, NULL, '2024-01-01 00:00:00+00', '2024-02-01 00:00:00+00', false),
   -- キャンセル済み
   ('66666666-6666-6666-6666-666666666666', 'platinum', 'sub_test_platinum_canceled', 'canceled', NULL, NULL, '2024-01-01 00:00:00+00', '2024-02-01 00:00:00+00', false);

   -- AI使用量ログのテストデータ
   INSERT INTO ai_usage_logs (user_id, provider, model, tokens_used, cost) VALUES
   ('22222222-2222-2222-2222-222222222222', 'openai', 'gpt-4o-mini', 150, 0.0002),
   ('22222222-2222-2222-2222-222222222222', 'openai', 'gpt-4o-mini', 200, 0.0003),
   ('33333333-3333-3333-3333-333333333333', 'openai', 'gpt-4o-mini', 300, 0.0004),
   ('33333333-3333-3333-3333-333333333333', 'openai', 'gpt-4o-mini', 250, 0.0003);
   EOF
   ```

2. **テストデータの投入**
   ```bash
   # Supabaseデータベースにテストデータを投入
   psql $SUPABASE_DATABASE_URL -f ./seeds/test-data.sql
   
   # または、Supabase SQL Editorで実行
   npx playwright-mcp browser navigate --url "https://supabase.com/dashboard/project/[PROJECT_ID]/sql"
   npx playwright-mcp browser evaluate --function "() => {
     // テストデータSQLをコピーして実行
     const testDataSQL = \`[上記のSQL内容]\`;
     return testDataSQL;
   }"
   ```

3. **データ整合性チェック**
   ```bash
   # 整合性チェック用クエリを実行
   psql $SUPABASE_DATABASE_URL -c "
   -- 全ユーザーのプランとサブスクリプション状態の整合性チェック
   SELECT 
       u.id,
       u.name,
       u.plan_id,
       us.status,
       us.cancel_at_period_end,
       CASE 
           WHEN u.plan_id = 'free' THEN 'OK'
           WHEN us.status IN ('trialing', 'active') THEN 'OK'
           ELSE 'INCONSISTENT'
       END as consistency_check
   FROM users u
   LEFT JOIN user_subscriptions us ON u.id = us.user_id
   WHERE u.plan_id != 'free';
   "
   ```

### 6. 開発サーバーの起動

#### 6.1 Docker環境での起動（推奨）

```bash
# Docker環境で開発サーバーを起動
docker-compose up -d

# ログを確認
docker-compose logs -f app

# ブラウザで http://localhost:3000 にアクセス
```

#### 6.2 ローカル環境での起動

```bash
# ローカル環境で開発サーバーを起動（モノレポ対応）
pnpm turbo dev

# ブラウザで http://localhost:3000 にアクセス
```

#### 6.3 Docker環境での便利なコマンド

```bash
# コンテナの停止
docker-compose down

# コンテナの再ビルド
docker-compose up --build

# 特定のサービスのみ起動
docker-compose up postgres redis

# コンテナ内でコマンドを実行（モノレポ対応）
docker-compose exec app pnpm install
docker-compose exec app pnpm turbo build
docker-compose exec app npx drizzle-kit generate
docker-compose exec app npx drizzle-kit migrate

# Redisに接続
docker-compose exec redis redis-cli

# ログの確認
docker-compose logs app
docker-compose logs redis

# ボリュームの削除（データを完全にリセット）
docker-compose down -v
```

### 7. トラブルシューティング

#### 7.1 よくある問題

1. **環境変数が読み込まれない**
   - `.env.local`ファイルが正しく作成されているか確認
   - アプリケーションを再起動
   - Docker環境では`docker-compose down && docker-compose up --build`で再起動
   - **重要**: Next.jsでは `.env.local` が最優先される

2. **Supabase接続エラー**
   - 環境変数の値が正しいか確認
   - Supabaseプロジェクトがアクティブか確認

3. **Stripe接続エラー**
   - APIキーが正しいか確認
   - テストモードと本番モードの設定を確認

4. **OpenAI接続エラー**
   - APIキーが有効か確認
   - レート制限に達していないか確認

#### 7.2 認証・ユーザー管理関連のトラブル

##### 新規登録時のデータベースエラー

**症状:**
```
Database error: {
  code: '23502',
  message: 'null value in column "id" of relation "users" violates not-null constraint'
}
```

**原因:**
- Supabase認証成功後のユーザーレコード作成でuserIdが未設定

**解決手順:**
1. **認証フロー確認**
   ```typescript
   const { data, error } = await supabase.auth.signUp({email, password});
   // data.user.id を確実に取得できているか確認
   ```

2. **API呼び出し修正**
   ```typescript
   const response = await fetch('/api/users', {
     method: 'POST',
     body: JSON.stringify({
       userId: data.user.id, // ← この行が必須
       email, name
     })
   });
   ```

3. **動作確認**
   ```bash
   # 手動テスト
   curl -X POST http://localhost:3000/api/users \
     -H "Content-Type: application/json" \
     -d '{"userId":"valid-uuid","email":"test@example.com","name":"Test"}'
   ```

**成功時のレスポンス例:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com", 
    "name": "Test User",
    "planType": "free",
    "createdAt": "2025-09-04T10:14:53.869244+00:00"
  }
}
```

5. **Docker関連の問題**
   - **コンテナが起動しない**
     ```bash
     # Docker Desktopが起動しているか確認
     docker --version
     
     # コンテナの状態を確認
     docker-compose ps
     
     # ログを確認
     docker-compose logs
     ```
   
   - **ポートが既に使用されている**
     ```bash
     # 使用中のポートを確認
     lsof -i :3000
     lsof -i :5432
     
     # 別のポートを使用する場合はdocker-compose.ymlを編集
     ```
   
   - **ボリュームの問題**
     ```bash
     # ボリュームをリセット
     docker-compose down -v
     docker-compose up --build
     ```
   
   - **メモリ不足**
     - Docker Desktopの設定でメモリを増やす
     - 不要なコンテナを停止: `docker system prune`
   
   - **権限の問題（Linux/macOS）**
     ```bash
     # ファイルの権限を確認
     ls -la
     
     # 必要に応じて権限を修正
     chmod 755 .
     ```

#### 7.2 ログの確認

##### 7.2.1 Docker環境でのログ確認

```bash
# 全サービスのログを確認
docker-compose logs

# 特定のサービスのログを確認
docker-compose logs app
docker-compose logs postgres
docker-compose logs redis

# リアルタイムでログを確認
docker-compose logs -f app

# 最新のログのみ表示
docker-compose logs --tail=100 app
```

##### 7.2.2 ローカル環境でのログ確認

```bash
# アプリケーションのログを確認
pnpm dev

# ブラウザの開発者ツールでコンソールエラーを確認
```

##### 7.2.3 システムログの確認

```bash
# Dockerシステムの状態確認
docker system df
docker system events

# コンテナのリソース使用状況確認
docker stats

# コンテナの詳細情報確認
docker-compose exec app ps aux
```

### 8. 本番環境へのデプロイ

#### 8.1 GitHub連携によるVercel自動デプロイ設定

1. **Vercelアカウントの作成**
   ```bash
   # Vercelにアクセス
   # https://vercel.com
   # GitHubアカウントでログイン
   ```

2. **GitHubリポジトリとの連携**
   ```bash
   # Vercelダッシュボードで以下を実行
   # 1. "New Project" をクリック
   # 2. GitHub リポジトリを選択
   # 3. プロジェクト名: product-base
   # 4. Framework Preset: Next.js
   # 5. Root Directory: ./apps/web（モノレポ構成のため）
   ```

3. **自動デプロイの設定**
   - **本番環境**: `main`ブランチへのpush → 本番デプロイ
   - **テスト環境**: `develop`または任意のブランチ → プレビューデプロイ
   - Pull Request作成時 → 自動プレビューデプロイ

4. **環境変数の設定**
   ```bash
   # Vercel Dashboard > Settings > Environment Variables
   # テスト環境用（Preview）
   NEXT_PUBLIC_SUPABASE_URL=テスト環境のSupabase URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=テスト環境のSupabase Anon Key
   # ... その他のテスト環境用API キー
   
   # 本番環境用（Production） 
   NEXT_PUBLIC_SUPABASE_URL=本番環境のSupabase URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=本番環境のSupabase Anon Key
   # ... その他の本番環境用API キー
   ```

#### 8.2 デプロイフロー

1. **開発フロー**
   ```bash
   # 1. ローカルで開発・テスト
   git checkout -b feature/new-feature
   # コード編集
   
   # 2. GitHub にプッシュ
   git add .
   git commit -m "新機能を追加"
   git push origin feature/new-feature
   
   # 3. Pull Request 作成
   # → Vercel が自動でプレビューデプロイを作成
   
   # 4. レビュー後、main ブランチにマージ
   # → Vercel が自動で本番デプロイを実行
   ```

2. **環境別の自動デプロイ**
   - **プレビュー環境**: 
     - トリガー: Pull Request作成・更新
     - DB: テスト環境Supabase
     - URL: `https://product-base-xxx-vercel.app`
   
   - **本番環境**: 
     - トリガー: `main` ブランチへのpush
     - DB: 本番環境Supabase  
     - URL: `https://product-base.vercel.app`

#### 8.3 本番環境の確認

- 本番URLでアプリケーションが正常に動作することを確認
- 各機能（認証、決済、OpenAI）が正常に動作することを確認
- エラーログを監視
- Vercel ダッシュボードでログを確認

## 次のステップ

セットアップが完了したら、以下のドキュメントを参照してください：

- [機能要件書](./functional-requirements.md)
- [画面設計書](./screen-design.md)
- [データベース設計書](./database-design.md)
- [ドメイン用語集](./domain-glossary.md)

## サポート

問題が発生した場合は、以下のリソースを確認してください：

- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Stripe公式ドキュメント](https://stripe.com/docs)
- [Drizzle ORM公式ドキュメント](https://orm.drizzle.team)
