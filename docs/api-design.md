# Product Base - API設計書

## 1. 概要

### 1.1 基本方針
- **アーキテクチャ**: Next.js App Router API Routes（サーバーレス）
- **認証方式**: Supabase Auth JWT
- **レスポンス形式**: JSON
- **エラーハンドリング**: 統一されたエラーレスポンス
- **プラン制限**: API実行前のプラン機能チェック

### 1.2 モノレポ構成での実装パターン
```typescript
// API層（/apps/web/app/api/）- 薄い受け口
export async function POST(request: Request) {
  // 1. バリデーション・認証
  // 2. アプリケーション層呼び出し
  // 3. レスポンス返却
}

// アプリケーション層（/src/application/）
export class UserService {
  // ビジネスロジック・プラン制御
}

// インフラ層（/src/infrastructure/）
export class UserRepository {
  // DB・外部API呼び出し
}
```

## 2. 共通仕様

### 2.1 認証
すべての認証が必要なAPIは以下のヘッダーが必要：
```http
Authorization: Bearer <supabase_jwt_token>
```

### 2.2 共通レスポンス形式

#### 成功レスポンス
```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}
```

#### エラーレスポンス
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### 2.3 共通エラーコード
| HTTPステータス | エラーコード | 説明 |
|---------------|-------------|------|
| 400 | VALIDATION_ERROR | バリデーションエラー |
| 401 | UNAUTHORIZED | 認証エラー |
| 403 | FORBIDDEN | 権限不足 |
| 403 | PLAN_RESTRICTION | プラン制限 |
| 404 | NOT_FOUND | リソース未存在 |
| 429 | RATE_LIMIT | レート制限 |
| 500 | INTERNAL_ERROR | サーバーエラー |

### 2.4 プラン制限チェック
```typescript
// 実装例：API実行前チェック
const plan = await getUserPlan(userId);
if (!plan.canUse("ai_requests")) {
  return Response.json({
    success: false,
    error: {
      code: "PLAN_RESTRICTION",
      message: "この機能はあなたのプランでは利用できません"
    }
  }, { status: 403 });
}
```

## 3. 認証API

### 3.1 ログイン
**エンドポイント**: `POST /api/auth/login`  
**説明**: Supabase Auth を使用したメール・パスワード認証

#### リクエスト
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

#### レスポンス
```typescript
interface LoginResponse {
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
    };
    session: {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };
  };
}
```

### 3.2 Google OAuth
**エンドポイント**: `POST /api/auth/oauth/google`  
**説明**: Google OAuth認証（Supabase Auth Provider使用）

#### リクエスト
```typescript
interface GoogleOAuthRequest {
  redirect_url?: string; // 認証後のリダイレクト先
}
```

#### レスポンス
```typescript
interface GoogleOAuthResponse {
  success: true;
  data: {
    auth_url: string; // Google認証URL
  };
}
```

### 3.3 ログアウト
**エンドポイント**: `POST /api/auth/logout`  
**認証**: 必須

#### レスポンス
```typescript
interface LogoutResponse {
  success: true;
  message: "ログアウトしました";
}
```

### 3.4 OAuth コールバック
**エンドポイント**: `GET /api/auth/callback`  
**説明**: OAuth認証後のコールバック処理

## 4. ユーザー管理API

### 4.1 現在のユーザー情報取得
**エンドポイント**: `GET /api/users/me`  
**認証**: 必須

#### レスポンス
```typescript
interface UserMeResponse {
  success: true;
  data: {
    id: string;
    email: string;
    name: string;
    plan_id: string;
    plan_name: string;
    stripe_customer_id: string | null;
    created_at: string;
    updated_at: string;
  };
}
```

### 4.2 ユーザー情報更新
**エンドポイント**: `PUT /api/users/me`  
**認証**: 必須

#### リクエスト
```typescript
interface UpdateUserRequest {
  name?: string;
}
```

#### レスポンス
```typescript
interface UpdateUserResponse {
  success: true;
  data: {
    id: string;
    name: string;
    updated_at: string;
  };
}
```

### 4.3 ユーザー作成（認証後必須）
**エンドポイント**: `POST /api/users`  
**説明**: Supabase認証成功後のユーザーレコード作成（必須処理）

#### 実装上の重要な注意
⚠️ **必須**: `userId` パラメータは auth.users.id と同じ値を使用すること

#### リクエスト
```typescript
interface CreateUserRequest {
  userId: string; // 【必須】Supabase auth.users.id
  email: string;
  name: string;
  planId?: 'free' | 'gold' | 'platinum';
}
```

#### 実装例
```typescript
// 認証成功後の処理例
const { data, error } = await supabase.auth.signUp({
  email, password
});

if (data.user) {
  // ユーザーレコード作成（userId必須）
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({
      userId: data.user.id, // ← これが重要
      email: data.user.email,
      name: userName
    })
  });
}
```

#### よくあるエラーと対処法
```typescript
// エラー例: 23502制約違反
{
  code: '23502',
  message: 'null value in column "id" violates not-null constraint'
}
// → userId パラメータが未設定。auth.users.id を渡すこと
```

## 5. サブスクリプション管理API

### 5.1 契約状態取得
**エンドポイント**: `GET /api/subscription/status`  
**認証**: 必須

#### レスポンス
```typescript
interface SubscriptionStatusResponse {
  success: true;
  data: {
    plan_id: string;
    plan_name: string;
    status: 'free' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
    subscription_id: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    trial_end: string | null;
    features: {
      [key: string]: {
        enabled: boolean;
        limit_value?: number;
      };
    };
  };
}
```

### 5.2 無料プラン登録
**エンドポイント**: `POST /api/subscription/free`  
**認証**: 必須

#### レスポンス
```typescript
interface FreeSubscriptionResponse {
  success: true;
  message: "無料プランに変更しました";
}
```

## 6. 決済API（Stripe連携）

### 6.1 Checkout セッション作成
**エンドポイント**: `POST /api/billing/checkout`  
**認証**: 必須

#### リクエスト
```typescript
interface CheckoutRequest {
  plan_id: 'gold' | 'platinum';
  billing_cycle: 'monthly' | 'yearly';
  success_url?: string;
  cancel_url?: string;
}
```

#### レスポンス
```typescript
interface CheckoutResponse {
  success: true;
  data: {
    checkout_url: string;
    session_id: string;
  };
}
```

### 6.2 Billing Portal セッション作成
**エンドポイント**: `POST /api/billing/portal`  
**認証**: 必須

#### リクエスト
```typescript
interface BillingPortalRequest {
  return_url?: string;
}
```

#### レスポンス
```typescript
interface BillingPortalResponse {
  success: true;
  data: {
    portal_url: string;
  };
}
```

### 6.3 Stripe Webhook
**エンドポイント**: `POST /api/billing/webhook`  
**認証**: Stripe署名検証

#### 処理イベント
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## 7. AI機能API

### 7.1 OpenAI API呼び出し
**エンドポイント**: `POST /api/ai/openai`  
**認証**: 必須  
**プラン制限**: Gold/Platinum のみ

#### リクエスト
```typescript
interface OpenAIRequest {
  message: string;
  model?: 'gpt-4o-mini';
  max_tokens?: number;
  temperature?: number;
}
```

#### レスポンス
```typescript
interface OpenAIResponse {
  success: true;
  data: {
    message: string;
    model: string;
    tokens_used: number;
    cost: number;
  };
}
```

### 7.2 Claude API呼び出し（将来対応）
**エンドポイント**: `POST /api/ai/claude`  
**認証**: 必須  
**プラン制限**: Platinum のみ

### 7.3 Gemini API呼び出し（将来対応）
**エンドポイント**: `POST /api/ai/gemini`  
**認証**: 必須  
**プラン制限**: Platinum のみ

### 7.4 AI使用量ログ記録
**エンドポイント**: `POST /api/ai/usage-log`  
**認証**: 必須（内部使用）

#### リクエスト
```typescript
interface AIUsageLogRequest {
  provider: 'openai' | 'claude' | 'gemini';
  model: string;
  tokens_used: number;
  cost: number;
}
```

## 8. 法令系API

### 8.1 利用規約取得
**エンドポイント**: `GET /api/legal/terms`

#### レスポンス
```typescript
interface TermsResponse {
  success: true;
  data: {
    content: string;
    version: string;
    updated_at: string;
  };
}
```

### 8.2 プライバシーポリシー取得
**エンドポイント**: `GET /api/legal/policy`

#### レスポンス
```typescript
interface PolicyResponse {
  success: true;
  data: {
    content: string;
    version: string;
    updated_at: string;
  };
}
```

## 9. エラーハンドリング実装例

### 9.1 共通エラーハンドラ
```typescript
// /src/shared/errors.ts
export class APIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
  }
}

export const handleAPIError = (error: unknown): Response => {
  if (error instanceof APIError) {
    return Response.json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    }, { status: error.statusCode });
  }
  
  return Response.json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました"
    }
  }, { status: 500 });
};
```

### 9.2 認証ミドルウェア
```typescript
// /apps/web/lib/auth.ts
export async function requireAuth(request: Request): Promise<string> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new APIError('UNAUTHORIZED', '認証が必要です', 401);
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new APIError('UNAUTHORIZED', '無効な認証トークンです', 401);
  }
  
  return user.id;
}
```

### 9.3 プラン制限チェック
```typescript
// /src/application/plan/plan.service.ts
export async function requirePlanFeature(userId: string, featureId: string): Promise<void> {
  const plan = await getUserPlan(userId);
  if (!plan.canUse(featureId)) {
    throw new APIError(
      'PLAN_RESTRICTION',
      `この機能は${plan.name}プランでは利用できません`,
      403,
      { required_plans: ['gold', 'platinum'] }
    );
  }
}
```

## 10. 実装優先度

### フェーズ1（MVP）
1. 認証API（ログイン・Google OAuth・ログアウト）
2. ユーザー管理API（情報取得・更新・作成）
3. サブスクリプション状態取得API
4. 無料プラン登録API

### フェーズ2（決済連携）
1. Checkout セッション作成API
2. Billing Portal API
3. Stripe Webhook API

### フェーズ3（AI機能）
1. OpenAI API
2. AI使用量管理
3. プラン制限実装

### フェーズ4（拡張）
1. Claude・Gemini API
2. 法令系API
3. 管理者機能（将来）

## 11. セキュリティ考慮事項

### 11.1 認証・認可
- Supabase JWT の適切な検証
- API毎の必要最小権限チェック
- プラン機能制限の確実な実装

### 11.2 入力検証
- すべての入力パラメータのバリデーション
- SQLインジェクション対策（Drizzle ORM使用）
- XSS対策（適切なエスケープ）

### 11.3 レート制限
```typescript
// 実装例：API毎のレート制限
const rateLimiter = {
  '/api/ai/openai': '10/minute',
  '/api/auth/login': '5/minute',
};
```

### 11.4 ログ・監視
- API アクセスログ
- エラー発生時の詳細ログ
- 異常なアクセスパターンの検知