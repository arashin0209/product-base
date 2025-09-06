# Product Base - 機能要件書

## 1. プロジェクト概要

Product Baseは、Next.js、Supabase、Stripe、AIサービス（OpenAI/Claude/Gemini）を組み合わせたSaaSベースアプリケーションのテンプレートです。

### 1.1 アーキテクチャ

- **フロントエンド**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **バックエンド**: Next.js API Routes（サーバーレス）
- **データベース**: Supabase (PostgreSQL) + Drizzle ORM
- **認証**: Supabase Auth
- **決済**: Stripe Billing Portal
- **生成AI**: OpenAI
- **デザインシステム**: DDD（ドメイン駆動設計）
- **構成**: モノレポ（pnpm + turbo）
- **デプロイ**: Vercel

### 1.2 モノレポ構成とAPI処理フロー

#### プロジェクト構成
```
/apps/web              # Next.js アプリ（フロント+API）
  /app/api            # Vercel サーバーレス関数（API エンドポイント）
/src                   # DDD層（ビジネスロジック）
  /domain             # ドメインモデル
  /application        # ユースケース
  /infrastructure     # 外部サービス連携
/packages/ui           # Shadcn UI 共通コンポーネント
/packages/shared-utils # 共通ユーティリティ
```

#### API処理フロー
```
1. リクエスト受信    /apps/web/app/api/users/route.ts
         ↓          (薄いAPI層: バリデーション・認証)
2. ビジネスロジック  /src/application/user/user.service.ts  
         ↓          (ユースケース・プラン制御・業務処理)
3. 外部サービス連携  /src/infrastructure/supabase/user.repository.ts
         ↓          (Supabase/Stripe/OpenAI 呼び出し)
4. レスポンス返却    /apps/web/app/api/users/route.ts
```

#### 実装例
```typescript
// API層（薄い受け口）
// /apps/web/app/api/users/route.ts
import { userService } from '@/src/application/user/user.service'

export async function POST(request: Request) {
  const body = await request.json()
  const result = await userService.createUser(body)
  return Response.json(result)
}

// アプリケーション層（ユースケース）
// /src/application/user/user.service.ts
export class UserService {
  async createUser(userData) {
    const user = new User(userData)
    return await this.userRepository.save(user)
  }
}

// インフラ層（外部連携）
// /src/infrastructure/supabase/user.repository.ts
export class UserRepository {
  async save(user) {
    return await supabase.from('users').insert(user)
  }
}
```

## 2. 認証機能

### 2.1 ユーザー登録・ログイン

#### 2.1.1 必須機能
- メールアドレス・パスワードによる新規登録
- メールアドレス・パスワードによるログイン
- Google OAuth認証
- ログアウト機能
- セッション管理

#### 2.1.2 認証フロー
1. **新規登録**
   - メールアドレス、パスワード、名前の入力
   - パスワードは8文字以上、英数字2種類以上混在
   - Supabase Auth.usersテーブルにユーザー作成
   - アプリケーション独自のusersテーブルにユーザー情報保存
   - デフォルトで無料プランに設定

2. **ログイン**
   - メールアドレス・パスワード認証
   - 認証成功後、ダッシュボードにリダイレクト

3. **Google OAuth**
   - **Supabase Auth の Google Provider を使用**
   - Google Cloud Console で OAuth 2.0 クライアント設定
   - Supabase ダッシュボードの Authentication > Providers でGoogle設定
   - フロントエンド: `supabase.auth.signInWithOAuth({ provider: 'google' })` 
   - 初回ログイン時にユーザーレコード自動作成
   - 既存ユーザーは既存レコードと連携
   - **環境変数でのGoogle認証情報管理は不要**（Supabase側で管理）

### 2.2 認証実装詳細
- **Supabase Auth を認証基盤として使用**
- **認証方式**: Email/Password + Google OAuth
- **セッション管理**: Supabase JWT による自動管理
- **ユーザー管理**: 
  - Supabase `auth.users` テーブル（認証情報）
  - アプリケーション `users` テーブル（プロフィール情報）
  - 両テーブルは `users.id = auth.users.id` で連携

### 2.3 セキュリティ要件
- パスワードの暗号化（Supabase標準）
- Supabaseによるセッション管理（JWT標準）
- CSRF/XSS対策
- 環境変数による秘密情報管理

## 3. プラン・サブスクリプション管理

### 3.1 プラン種別
- **無料プラン (free)**: 基本機能のみ
- **Goldプラン (gold)**: 拡張機能あり
- **プラチナプラン (platinum)**: 全機能利用可能
- **1週間無料トライアル**: 有料プラン機能を7日間体験可能

### 3.2 プラン管理機能

#### 3.2.1 機能制御システム

**テーブル構成と役割:**
- **features テーブル**: システム全体の機能マスターデータ
  - 機能の定義（機能名、説明、システム全体での有効/無効）
  - 新機能追加時はまずここに登録
  - `is_active = false` で機能の一時停止が可能

- **plan_features テーブル**: プランと機能の関連管理
  - 各プランでの機能有効化フラグ（enabled）
  - 使用量制限値の管理（limit_value）
  - プラン別の機能利用可否を制御

**データ管理フロー:**
1. **機能定義**: features テーブルに新機能を登録
2. **プラン設定**: plan_features テーブルで各プランの利用可否を設定
3. **運用制御**: features.is_active で機能の一時停止/再開
4. **利用判定**: 両テーブルのJOINで最終的な利用可否を判定

**実装における制御レベル:**
- **システムレベル制御**: features.is_active による全体制御
- **プランレベル制御**: plan_features.enabled による個別制御
- **使用量制御**: plan_features.limit_value による制限管理
- APIレベルでの機能制限チェック
- フロントエンドでの機能表示制御

#### 3.2.2 機能判定ロジック
```sql
-- ユーザーの機能利用可否チェック
SELECT 
    f.id as feature_id,
    f.display_name,
    COALESCE(pf.enabled, false) as is_enabled,
    pf.limit_value
FROM features f
LEFT JOIN plan_features pf ON f.id = pf.feature_id 
    AND pf.plan_id = (SELECT plan_id FROM users WHERE id = ?)
WHERE f.is_active = true;
```

#### 3.2.3 運用シナリオ例

**新機能追加時:**
```sql
-- 1. features テーブルに機能定義
INSERT INTO features (id, name, display_name, description, is_active) 
VALUES ('video_export', 'Video Export', '動画エクスポート', '動画形式での書き出し', true);

-- 2. 各プランでの利用可否を設定
INSERT INTO plan_features (plan_id, feature_id, enabled, limit_value) VALUES
('free', 'video_export', false, 0),        -- 無料プランでは利用不可
('gold', 'video_export', false, 0),        -- Goldでは未対応
('platinum', 'video_export', true, 5);     -- Platinumで月5回まで
```

**機能の一時停止:**
```sql
-- システム全体で機能を無効化
UPDATE features SET is_active = false WHERE id = 'custom_theme';
-- → 全プランで自動的に利用不可となる
```

**プラン機能の調整:**
```sql
-- 特定プランでの制限値変更
UPDATE plan_features 
SET limit_value = 2000 
WHERE plan_id = 'gold' AND feature_id = 'ai_requests';
```

#### 3.2.4 実装パターン
1. **API制限チェック**
```typescript
// 機能実行前のチェック例
async function checkFeatureAccess(userId: string, featureId: string) {
    const hasAccess = await db
        .select({ enabled: planFeatures.enabled })
        .from(users)
        .innerJoin(planFeatures, eq(users.planId, planFeatures.planId))
        .where(and(
            eq(users.id, userId),
            eq(planFeatures.featureId, featureId),
            eq(planFeatures.enabled, true)
        ));
    
    return hasAccess.length > 0;
}
```

2. **使用量制限チェック**
```typescript
// 月間使用量チェック例（AI機能）
async function checkUsageLimit(userId: string, featureId: string) {
    const [limit, currentUsage] = await Promise.all([
        // プランの制限値取得
        db.select({ limitValue: planFeatures.limitValue })
            .from(planFeatures)
            .where(eq(planFeatures.featureId, featureId)),
        
        // 今月の使用量取得
        db.select({ count: count() })
            .from(aiUsageLogs)
            .where(and(
                eq(aiUsageLogs.userId, userId),
                gte(aiUsageLogs.createdAt, startOfMonth)
            ))
    ]);
    
    return currentUsage < (limit?.limitValue || 0);
}
```

3. **最終判定クエリ**
```typescript
// ユーザーの利用可能機能一覧取得
const userFeatures = await db
  .select({
    featureId: features.id,
    displayName: features.displayName,
    enabled: planFeatures.enabled,
    limitValue: planFeatures.limitValue,
  })
  .from(features)
  .innerJoin(planFeatures, eq(features.id, planFeatures.featureId))
  .innerJoin(users, eq(planFeatures.planId, users.planId))
  .where(and(
    eq(users.id, userId),
    eq(features.isActive, true),    // システムレベルで有効
    eq(planFeatures.enabled, true) // プランレベルで許可
  ));
```

#### 3.2.5 フロントエンド制御
```typescript
// コンポーネントでの機能表示制御
const UserFeatures = ({ userPlan }: { userPlan: string }) => {
    const features = usePlanFeatures(userPlan);
    
    return (
        <div>
            {features.ai_requests && <AIRequestButton />}
            {features.export_csv && <ExportButton />}
            {features.custom_theme && <ThemeSelector />}
            {features.priority_support && <PrioritySupportBadge />}
        </div>
    );
};
```

#### 3.2.6 プラン別機能マトリックス
| 機能ID | 機能名 | Free | Gold | Platinum |
|--------|--------|------|------|----------|
| ai_requests | AI機能 | ❌ | ✅ (1000回/月) | ✅ (無制限) |
| export_csv | CSVエクスポート | ❌ | ✅ | ✅ |
| custom_theme | カスタムテーマ | ❌ | ❌ | ✅ |
| priority_support | 優先サポート | ❌ | ❌ | ✅ |
| api_access | API アクセス | ❌ | ❌ | ✅ |

### 3.3 決済・サブスクリプション
#### 3.3.1 Stripe連携
- Stripe Checkout による有料プラン登録
- Stripe Billing Portal による契約管理
- Stripe Webhook による契約状態同期

#### 3.3.2 決済フロー
1. ユーザーが有料プランを選択
2. Stripe Checkoutで決済処理
3. Webhookでデータベース更新
4. プラン機能の有効化
5. サービスの画面に即時反映

### 3.4 サブスクリプションステータス管理

#### 3.4.1 ステータス種別（Stripe準拠）
- **incomplete**: 初回支払い失敗（3DS認証待ちなど）
- **incomplete_expired**: 初回支払い23時間以内に完了せず終了
- **trialing**: 無料トライアル期間中
- **active**: 正常アクティブ状態
- **past_due**: 支払い失敗、再試行中（一時的）
- **canceled**: キャンセル済み（終了状態）
- **unpaid**: 支払い失敗継続、機能停止状態

#### 3.4.2 キャンセル予定管理
- **cancel_at_period_end**: boolean型フィールドで管理
- **true**: 現在期間終了時にキャンセル予定（機能は継続利用可能）
- **false**: 通常の継続予定

#### 3.4.3 機能利用可否判定
```
機能利用可能な状態:
- 無料プラン: users.plan_id = 'free'
- 有料プラン: user_subscriptions.status IN ('trialing', 'active')

機能制限状態:
- user_subscriptions.status IN ('past_due', 'unpaid', 'canceled', 'incomplete_expired')
- user_subscriptions が存在しないが plan_id != 'free'

支払い確認待ち:
- user_subscriptions.status = 'incomplete'
```

#### 3.4.4 ユーザー向け表示ロジック
1. **アクティブ（継続予定）**
   - status = 'active' AND cancel_at_period_end = false
   - 表示: "次回更新日: {current_period_end}"

2. **アクティブ（キャンセル予定）**
   - status = 'active' AND cancel_at_period_end = true
   - 表示: "{current_period_end}にキャンセル予定"

3. **トライアル中（継続予定）**
   - status = 'trialing' AND cancel_at_period_end = false
   - 表示: "トライアル期間: {trial_end}まで"

4. **トライアル中（キャンセル予定）**
   - status = 'trialing' AND cancel_at_period_end = true
   - 表示: "トライアル中（キャンセル予定）"

5. **支払い失敗**
   - status = 'past_due'
   - 表示: "支払い方法の更新が必要です"
   - 機能: 制限付きで利用継続

6. **支払い失敗継続**
   - status = 'unpaid'
   - 表示: "支払いが確認できません"
   - 機能: 停止状態

7. **支払い確認待ち**
   - status = 'incomplete'
   - 表示: "支払い確認中です"
   - 機能: 3DS認証等の完了待ち

#### 3.4.5 Webhook処理要件
- Stripe Webhookで user_subscriptions テーブルを同期
- status, cancel_at_period_end, current_period_end の更新
- 期間終了時の自動キャンセル処理

## 4. AI機能連携

### 4.1 対応AIサービス
- **OpenAI** (GPT-4o mini)
- 初期実装はOpenAIのみ対応
- 将来的にClaude、Geminiの対応を計画（フェーズ2以降）
- 環境変数で設定変更できるようにする

### 4.2 AI機能要件
#### 4.2.1 基本機能
- テキスト入力による AI チャット機能
- リアルタイムでのレスポンス表示
- チャット履歴の表示：直近の5件
- 使用量（トークン数）の記録と表示

#### 4.2.2 プラン制限
- 無料プラン: AI機能利用不可
- Goldプラン: 月1000回まで利用可能
- プラチナプラン: 無制限利用

#### 4.2.3 技術仕様
- OpenAI GPT-4o mini モデル使用
- max_tokens: 1000
- temperature: 0.7
- API呼び出しのエラーハンドリング
- 使用量ログのデータベース記録

## 5. ユーザー管理機能

### 5.1 ユーザー情報管理
- プロフィール表示・編集
- プラン状態確認
- 利用状況の表示
- アカウント削除（退会）

### 5.2 管理者機能（将来拡張）
- ユーザー一覧・検索
- プラン変更
- 利用統計の確認

## 6. 画面・UI要件

### 6.1 共通UI要件
- レスポンシブデザイン（モバイル・タブレット・PC対応）
- ダークモード対応（shadcn/ui標準）
- アクセシビリティ対応
- ローディング・エラー状態の表示
詳細はscreen-design.mdを参照

### 6.2 必須画面
- ログイン画面
- 新規登録画面
- ダッシュボード（ホーム画面）
  - AIチャット機能（メイン機能）
  - ハンバーガーメニュー
- プラン選択・変更画面
- プロフィール設定画面
- 利用規約・プライバシーポリシー画面

### 6.3 ナビゲーション要件
- **ハンバーガーメニュー**: モバイル・デスクトップ共通
  - ユーザー情報表示（名前、メール、プラン）
  - プラン設定メニュー
  - ログアウトメニュー
- **レスポンシブ対応**: 全デバイス対応

## 7. 非機能要件

### 7.1 パフォーマンス
- ページ読み込み時間3秒以内
- API応答時間500ms以内（通常操作）
- AI API呼び出しは適切なタイムアウト設定

### 7.2 可用性
- Vercelによる自動スケーリング
- Supabaseの99.9%稼働率保証
- エラー監視とログ収集

### 7.3 セキュリティ
- HTTPS通信の強制
- 環境変数による機密情報管理
- SQLインジェクション対策
- 適切な認可制御

## 8. API仕様

### 8.1 認証API（Supabase Auth 使用）
- **Supabase クライアント経由で認証処理**:
  - `supabase.auth.signUp()` - 新規登録
  - `supabase.auth.signInWithPassword()` - Email/Password ログイン  
  - `supabase.auth.signInWithOAuth({ provider: 'google' })` - Google OAuth
  - `supabase.auth.signOut()` - ログアウト
- **カスタム API**:
  - `GET /api/auth/callback` - OAuth コールバック（リダイレクト処理）
  - `POST /api/auth/sync-user` - ユーザープロフィール同期

### 8.2 ユーザーAPI
- `GET /api/users/me` - 現在のユーザー情報取得
- `PUT /api/users/me` - ユーザー情報更新

### 8.3 サブスクリプションAPI
- `GET /api/subscription/status` - 契約状態取得
- `POST /api/billing/checkout` - Checkout セッション作成
- `POST /api/billing/portal` - Billing Portal セッション作成
- `POST /api/billing/webhook` - Stripe Webhook

### 8.4 AI API
- `POST /api/ai/openai` - OpenAI API呼び出し
- `POST /api/ai/usage-log` - AI使用量ログ記録

## 9. データ整合性要件

### 9.1 ユーザーデータ
- Supabase Auth.usersとアプリケーションusersテーブルの整合性
- プラン変更時の即座反映
- Stripe契約状態とDBの同期

### 9.2 トランザクション管理
- 決済処理の冪等性保証
- Webhook処理の重複実行対策
- データ整合性チェック機能

## 10. 運用・保守要件

### 10.1 ログ・監視
- アプリケーションログの記録
- エラー通知機能
- パフォーマンス監視

### 10.2 バックアップ・復旧
- Supabase自動バックアップ機能の活用
- 重要データの定期エクスポート
- 災害復旧計画

## 11. 拡張性要件

### 11.1 モジュール拡張
- 新規AI サービスの追加
- カスタムプランの作成
- 追加機能の実装

### 11.2 スケーラビリティ
- ユーザー数増加への対応
- API呼び出し量の増加対応
- データベース容量拡張

## 12. テスト要件

### 12.1 テスト種別
- ユニットテスト（domain/application層）
- 統合テスト（API エンドポイント）
- E2Eテスト（主要ユーザーフロー）

### 12.2 テスト対象
- 認証フロー
- プラン変更フロー
- 決済フロー
- AI API呼び出し

## 13. リリース・デプロイメント

### 13.1 CI/CD要件
- **GitHub Actions**: 自動テスト・コード品質チェック
- **Vercel GitHub連携**: 自動デプロイ
  - Pull Request作成・更新 → プレビューデプロイ（テスト環境）
  - main ブランチへのpush → 本番デプロイ
- **データベースマイグレーション**: Supabase Migration（手動実行）

### 13.2 環境管理
- **開発環境**: ローカル Docker + テスト環境Supabase DB
- **テスト環境**: Vercel Preview + テスト環境Supabase DB  
- **本番環境**: Vercel Production + 本番環境Supabase DB

## 14. 実装時の重要な考慮事項

### 14.1 モノレポ構成での開発上の注意点

#### TypeScriptパス設定の制限
```typescript
// ⚠️ 注意: Next.js App Router ではパスエイリアス(@/)が一部で動作しない
// APIエンドポイントとサービスクラスでは相対パス推奨

// APIエンドポイント例 (/apps/web/app/api/plans/route.ts)
import { PlanService } from '../../../../../../src/application/plan/plan.service'

// サービスクラス例 (/src/application/plan/plan.service.ts)  
import { db } from '../../infrastructure/database/connection'
```

#### 開発サーバー運用のベストプラクティス
- **パス変更後**: 必ず開発サーバー再起動
- **データベース変更後**: マイグレーション + シードデータ確認
- **環境変数変更後**: `.env.local`確認 + サーバー再起動

### 14.2 既存システム統合時の考慮事項

#### Supabase Auth テーブルとの併用
```sql
-- 既存: auth.users テーブル活用
-- 新規: 正規化されたテーブル追加（features, plan_features等）
-- 結合: SQLクエリでauth.usersと新テーブルを連携
```

#### データマイグレーション戦略
1. **Phase 1**: 新テーブル作成（既存システム影響なし）
2. **Phase 2**: サービスクラス統合（既存構造対応）  
3. **Phase 3**: APIエンドポイント段階移行
4. **Phase 4**: フロントエンド新機能追加

### 14.3 トラブルシューティング時の対応方針

#### 優先順位付きチェックリスト
1. **環境変数**: `.env.local`の設定確認
2. **データベース**: テーブル存在 + シードデータ確認  
3. **パス解決**: インポートパス + 開発サーバー再起動
4. **制約設定**: 主キー・外部キー制約の確認
5. **権限設定**: Supabase RLS + API認証確認

このようにして、段階的かつ安全に機能拡張を行うことで、既存システムの安定性を保ちつつ新機能を追加できます。

## 15. 実装時のトラブルシューティング経験

### 15.1 プラン情報取得問題の解決 (2025-09-06)

#### 問題の概要
プライシングページでプラン情報が正常に表示されず、以下のエラーが発生：
- `/api/plans` で500エラー
- `/api/users/me/plan` で500エラー
- フロントエンドでプラン情報が表示されない

#### 根本原因の特定
1. **Drizzleスキーマの不整合**
   - `plans`テーブルで`stripePriceId`カラムが未定義
   - 実際のDB構造とDrizzleスキーマファイルの不一致

2. **PlanServiceの古い参照**
   - 存在しない`stripePriceIdMonthly`カラムを参照
   - スキーマ統一前の古いカラム名を使用

3. **認証関数の設定ミス**
   - `requireAuth`で`service key`の代わりに`anon key`を使用
   - `getUser`メソッドに不適切なSupabaseクライアント設定

#### 解決手順
1. **Drizzleスキーマ修正**
   ```typescript
   // src/infrastructure/database/schema.ts
   export const plans = pgTable('plans', {
     // ... 他のカラム
     stripePriceId: varchar('stripe_price_id', { length: 100 }), // 追加
     // ... 他のカラム
   })
   ```

2. **PlanService修正**
   ```typescript
   // src/application/plan/plan.service.ts
   const plansList = await db
     .select({
       // ... 他のフィールド
       stripePriceId: plans.stripePriceId, // 正しいカラム名に修正
     })
     .from(plans)
   ```

3. **認証関数最適化**
   ```typescript
   // apps/web/app/lib/auth.ts
   export async function requireAuth(request: NextRequest): Promise<string> {
     // 通常のSupabaseクライアント（anon key）を使用
     const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     const supabase = createClient(supabaseUrl, supabaseAnonKey)
     
     const { data: { user }, error } = await supabase.auth.getUser(token)
     // ...
   }
   ```

#### 解決結果
- **プランAPI**: 200 OKレスポンス、正常なプランデータ取得
- **ユーザープラン情報API**: 200 OKレスポンス、認証されたユーザーのプラン情報取得
- **フロントエンド**: プライシングページでプラン情報が完全に表示

#### 学んだ教訓
1. **スキーマ整合性の重要性**: Drizzleスキーマと実際のDB構造の完全一致が必須
2. **段階的修正の必要性**: スキーマ変更時は関連するすべてのコードを同時に修正
3. **認証設定の適切性**: Supabaseの各メソッドに適切なクライアント設定が必要
4. **エラーハンドリングの重要性**: 詳細なログ出力により問題の特定が迅速化

### 15.2 開発時のベストプラクティス

#### スキーマ変更時のチェックリスト
1. **Drizzleスキーマファイルの確認**
   - 実際のDB構造と完全一致しているか
   - カラム名、型、制約が正しく定義されているか

2. **関連コードの修正**
   - PlanService、AiService等のサービスクラス
   - APIエンドポイント
   - フロントエンドのインターフェース

3. **認証設定の確認**
   - Supabaseクライアントの適切な設定
   - 環境変数の正しい使用

4. **動作確認**
   - 開発サーバーの再起動
   - APIエンドポイントのテスト
   - フロントエンドの表示確認

#### エラー診断の手順
1. **サーバーログの確認**: 詳細なエラーメッセージの確認
2. **データベース接続の確認**: 直接SQLクエリでの動作確認
3. **APIエンドポイントの個別テスト**: curl等での直接テスト
4. **フロントエンドコンソールの確認**: ブラウザ開発者ツールでのエラー確認

この経験により、より堅牢で保守性の高いシステム構築が可能になります。