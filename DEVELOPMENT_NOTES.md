# Product Base 開発ノート

## 2025-09-04 修正内容

### 問題: 新規登録時の「Failed to create user record」エラー

#### エラーの詳細
```
Database error: {
  code: '23502',
  details: 'Failing row contains (null, test@example.com, Test User, free, active, null, null, 2025-09-04 10:13:48.019043+00, 2025-09-04 10:13:48.019043+00).',
  hint: null,
  message: 'null value in column "id" of relation "users" violates not-null constraint'
}
```

#### 根本原因
1. **データベース設計の問題**: `users`テーブルの`id`カラムが`uuid('id').primaryKey()`として定義されているが、`defaultRandom()`が設定されていない
2. **Supabase認証連携の理解不足**: Supabaseの認証システムでは、`auth.users`テーブルの`id`を`users`テーブルの`id`として使用する必要がある
3. **API設計の問題**: 新規登録時にユーザーIDを渡していない

#### 修正手順

1. **APIエンドポイントの修正** (`apps/web/src/app/api/users/route.ts`)
   - `userId`パラメータを追加
   - データベース挿入時に`id: userId`を指定

2. **認証フローの修正** (`apps/web/src/lib/supabase-auth.ts`)
   - 新規登録成功後に`data.user.id`を取得
   - API呼び出し時に`userId`を含める

3. **環境変数の修正**
   - `.env.local`ファイルを作成
   - Next.jsアプリケーションを再起動

#### 修正後の動作確認
```bash
# APIテスト
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","planType":"free","userId":"550e8400-e29b-41d4-a716-446655440000"}'

# レスポンス
{"success":true,"data":{"id":"550e8400-e29b-41d4-a716-446655440000","email":"test@example.com","name":"Test User","planType":"free","planStatus":"active","createdAt":"2025-09-04T10:14:53.869244+00:00","updatedAt":"2025-09-04T10:14:53.869244+00:00"}}
```

#### 学んだ教訓
1. **Supabase認証の理解**: `auth.users`と`users`テーブルは連携して使用する
2. **データベース設計**: 外部キー制約を考慮した設計が重要
3. **環境変数管理**: Next.jsでは`.env.local`ファイルが優先される
4. **エラーハンドリング**: 詳細なエラーメッセージを出力することで問題特定が容易

#### 今後の改善点
1. 型安全性の向上（Zodスキーマの導入）
2. エラーハンドリングの統一化
3. ログ出力の改善
4. テストの追加

## 技術スタック
- **フロントエンド**: Next.js 15, React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase PostgreSQL
- **認証**: Supabase Auth
- **決済**: Stripe
- **AI**: OpenAI, Anthropic

## 開発環境
- **Node.js**: 18.x (20.x推奨)
- **パッケージマネージャー**: npm
- **モノレポ**: Turborepo
- **データベース**: Supabase PostgreSQL (接続プーラー経由)
