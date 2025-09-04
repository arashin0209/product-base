# Product Base

Next.js + TypeScript + Supabase + Stripe + DDD + Shadcn UI + ORM + Vercel対応のモノレポテンプレート

## 特徴

- **モノレポ構成**: Turborepoを使用した効率的な開発環境
- **DDD設計**: Domain-Driven Designに基づいたアーキテクチャ
- **認証**: Supabase Authによる認証システム
- **決済**: Stripe Billing Portal対応
- **UI**: Shadcn UI + Tailwind CSS
- **ORM**: Drizzle ORM
- **プラン管理**: ON/OFFベースの機能差管理
- **Docker対応**: 開発・本番環境のDocker化

## 技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript
- **UI**: Shadcn UI, Tailwind CSS
- **認証**: Supabase Auth
- **決済**: Stripe
- **データベース**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **状態管理**: Zustand
- **モノレポ**: Turborepo
- **コンテナ**: Docker

## ディレクトリ構成

```
/
├── apps/
│   └── web/                    # Next.jsアプリケーション
│       ├── app/               # App Router
│       │   ├── api/           # APIルート
│       │   └── dashboard/     # ダッシュボードページ
│       ├── src/
│       │   ├── domain/        # ドメイン層
│       │   ├── application/   # アプリケーション層
│       │   ├── infrastructure/ # インフラ層
│       │   └── shared/        # 共通要素
│       └── components/        # アプリ固有コンポーネント
├── packages/
│   ├── ui/                    # 共通UIコンポーネント
│   └── shared-utils/          # 共通ユーティリティ
└── docker/                    # Docker設定
```

## セットアップ

### 1. 環境変数の設定

```bash
cp env.sample .env
```

`.env`ファイルに必要な環境変数を設定してください。

### 2. 依存関係のインストール

```bash
npm install
```

### 3. データベースのセットアップ

```bash
# マイグレーションの実行
npm run db:migrate --workspace=web

# データベーススタジオの起動（オプション）
npm run db:studio --workspace=web
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

## Dockerでの実行

### 開発環境

```bash
docker-compose -f docker-compose.dev.yml up
```

### 本番環境

```bash
docker-compose up
```

## 主要機能

### 認証システム
- メール/パスワード認証
- Google OAuth認証
- ユーザー登録・ログイン・ログアウト

### プラン管理
- Free, Gold, Platinumプラン
- ON/OFFベースの機能差管理
- Stripe Billing Portal連携

### API設計
- RESTful API
- 統一されたエラーハンドリング
- 認証・認可のミドルウェア

## 開発ガイド

### 新しい機能の追加

1. **ドメイン層**: `src/domain/` にエンティティを定義
2. **アプリケーション層**: `src/application/` にユースケースを実装
3. **インフラ層**: `src/infrastructure/` に外部サービス連携を実装
4. **API層**: `app/api/` にエンドポイントを追加
5. **UI層**: `components/` にコンポーネントを実装

### 共通UIコンポーネント

`packages/ui/` に共通で使用するUIコンポーネントを配置します。

### テスト

```bash
# 全テストの実行
npm run test

# 型チェック
npm run type-check

# リント
npm run lint
```

## デプロイ

### Vercel

1. Vercelにプロジェクトを接続
2. 環境変数を設定
3. ビルドコマンド: `npm run build --workspace=web`
4. 出力ディレクトリ: `apps/web/.next`

### Docker

```bash
# イメージのビルド
docker build -t product-base .

# コンテナの実行
docker run -p 3000:3000 product-base
```

## ライセンス

MIT License