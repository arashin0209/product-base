# Product Base - データベース設計書

## 1. 概要

### 1.1 データベース基本情報
- **DBMS**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **マイグレーション**: Drizzle Kit
- **文字エンコーディング**: UTF-8

### 1.2 設計方針
- 正規化による冗長性排除
- パフォーマンスを考慮したインデックス設計
- Supabase Auth テーブルとの適切な連携
- 拡張性を考慮したスキーマ設計

## 2. ER図

```mermaid
erDiagram
    auth_users ||--|| users : "1対1"
    users ||--o{ user_subscriptions : "1対多"
    users ||--o{ ai_usage_logs : "1対多"
    plans ||--o{ plan_features : "1対多"
    plans ||--o{ user_subscriptions : "1対多"
    features ||--o{ plan_features : "1対多"
    
    auth_users {
        uuid id PK
        string email
        string encrypted_password
        timestamp created_at
        timestamp updated_at
    }
    
    users {
        uuid id PK, FK
        string name
        string plan_id FK
        string stripe_customer_id
        timestamp created_at
        timestamp updated_at
    }
    
    plans {
        string id PK
        string name
        string display_name
        decimal price_monthly
        decimal price_yearly
        string stripe_price_id_monthly
        string stripe_price_id_yearly
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    features {
        string id PK
        string name
        string display_name
        string description
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    plan_features {
        string plan_id PK, FK
        string feature_id PK, FK
        boolean enabled
        integer limit_value
        timestamp created_at
        timestamp updated_at
    }
    
    user_subscriptions {
        uuid id PK
        uuid user_id FK
        string plan_id FK
        string stripe_subscription_id
        string status
        timestamp trial_start
        timestamp trial_end
        timestamp current_period_start
        timestamp current_period_end
        boolean cancel_at_period_end
        timestamp created_at
        timestamp updated_at
    }
    
    ai_usage_logs {
        uuid id PK
        uuid user_id FK
        string provider
        string model
        integer tokens_used
        decimal cost
        timestamp created_at
    }
```

## 3. テーブル設計

### 3.1 認証関連テーブル

#### 3.1.1 auth.users (Supabase 標準テーブル)
Supabaseが自動生成・管理する認証用テーブル。直接操作は行わない。
**メールアドレスは auth.users.email を唯一のソースとして使用し、users テーブルでは重複管理しない。**

| 項目名 | 型 | 制約 | 説明 |
|--------|----|----|------|
| id | uuid | PK, NOT NULL | ユーザー識別ID |
| email | varchar | UNIQUE, NOT NULL | メールアドレス |
| encrypted_password | varchar | | 暗号化パスワード |
| created_at | timestamptz | NOT NULL | 作成日時 |
| updated_at | timestamptz | NOT NULL | 更新日時 |

#### 3.1.2 users (アプリケーション用ユーザーテーブル)

| 項目名 | 型 | 制約 | デフォルト値 | 説明 |
|--------|----|----|-------------|------|
| id | uuid | PK, FK | | auth.users.id と同じ値 |
| name | varchar(100) | NOT NULL | | ユーザー名 |
| plan_id | varchar(50) | NOT NULL, FK | 'free' | プランID (plans.id への外部キー) |
| stripe_customer_id | varchar(100) | | | Stripe 顧客ID |
| created_at | timestamptz | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | timestamptz | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

**⚠️ 重要な実装上の注意:**
- **Supabase認証連携**: usersテーブルのidは必ずauth.users.idと同じ値を使用すること
- **新規登録時**: API呼び出し時に`userId`パラメータが必須
- **制約違反エラー**: idがnullの場合、23502エラー（null value in column "id" violates not-null constraint）が発生

```sql
-- インデックス
CREATE INDEX idx_users_plan_id ON users(plan_id);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- 外部キー制約
ALTER TABLE users ADD CONSTRAINT fk_users_auth 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE users ADD CONSTRAINT fk_users_plan 
    FOREIGN KEY (plan_id) REFERENCES plans(id);
```

### 3.2 プラン・機能管理テーブル

#### 3.2.1 plans (プランマスターテーブル)

| 項目名 | 型 | 制約 | デフォルト値 | 説明 |
|--------|----|----|-------------|------|
| id | varchar(50) | PK | | プランID (free/gold/platinum) |
| name | varchar(100) | NOT NULL | | プラン名 |
| display_name | varchar(100) | NOT NULL | | 表示用プラン名 |
| price_monthly | decimal(10,2) | | | 月額料金 |
| price_yearly | decimal(10,2) | | | 年額料金 |
| stripe_price_id_monthly | varchar(100) | | | Stripe価格ID(月額) |
| stripe_price_id_yearly | varchar(100) | | | Stripe価格ID(年額) |
| is_active | boolean | NOT NULL | true | 有効フラグ |
| created_at | timestamptz | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | timestamptz | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

```sql
-- 初期データ
INSERT INTO plans (id, name, display_name, price_monthly, price_yearly, is_active) VALUES
('free', 'Free Plan', '無料プラン', 0.00, 0.00, true),
('gold', 'Gold Plan', 'ゴールドプラン', 980.00, 9800.00, true),
('platinum', 'Platinum Plan', 'プラチナプラン', 2980.00, 29800.00, true);
```

#### 3.2.2 features (機能マスターテーブル)

| 項目名 | 型 | 制約 | デフォルト値 | 説明 |
|--------|----|----|-------------|------|
| id | varchar(50) | PK | | 機能ID |
| name | varchar(100) | NOT NULL | | 機能名 |
| display_name | varchar(100) | NOT NULL | | 表示用機能名 |
| description | text | | | 機能説明 |
| is_active | boolean | NOT NULL | true | 有効フラグ |
| created_at | timestamptz | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | timestamptz | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

```sql
-- 初期データ
INSERT INTO features (id, name, display_name, description, is_active) VALUES
('ai_requests', 'AI Requests', 'AI機能', 'OpenAI/Claude/Geminiへのリクエスト機能', true),
('export_csv', 'Export CSV', 'CSVエクスポート', 'データのCSVエクスポート機能', true),
('custom_theme', 'Custom Theme', 'カスタムテーマ', 'UIテーマカスタマイズ機能', true),
('priority_support', 'Priority Support', '優先サポート', '優先的なカスタマーサポート', true),
('api_access', 'API Access', 'API アクセス', '外部APIアクセス機能', true);
```

#### 3.2.3 plan_features (プラン機能関連テーブル)

| 項目名 | 型 | 制約 | デフォルト値 | 説明 |
|--------|----|----|-------------|------|
| plan_id | varchar(50) | PK, FK | | プランID |
| feature_id | varchar(50) | PK, FK | | 機能ID |
| enabled | boolean | NOT NULL | false | 機能有効フラグ |
| limit_value | integer | | | 利用制限値 (NULL=無制限) |
| created_at | timestamptz | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | timestamptz | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

```sql
-- 外部キー制約
ALTER TABLE plan_features ADD CONSTRAINT fk_plan_features_plan 
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE;
    
ALTER TABLE plan_features ADD CONSTRAINT fk_plan_features_feature 
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE;

-- 初期データ
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

### 3.3 サブスクリプション管理テーブル

#### 3.3.1 user_subscriptions (ユーザーサブスクリプションテーブル)

| 項目名 | 型 | 制約 | デフォルト値 | 説明 |
|--------|----|----|-------------|------|
| id | uuid | PK | gen_random_uuid() | サブスクリプションID |
| user_id | uuid | FK, NOT NULL | | ユーザーID |
| plan_id | varchar(50) | FK, NOT NULL | | プランID |
| stripe_subscription_id | varchar(100) | UNIQUE | | Stripe サブスクリプションID |
| status | varchar(20) | NOT NULL | | ステータス (Stripe準拠: incomplete/incomplete_expired/trialing/active/past_due/canceled/unpaid) |
| trial_start | timestamptz | | | トライアル開始日 |
| trial_end | timestamptz | | | トライアル終了日 |
| current_period_start | timestamptz | | | 現在の期間開始日 |
| current_period_end | timestamptz | | | 現在の期間終了日 |
| cancel_at_period_end | boolean | NOT NULL | false | 期間終了時キャンセル |
| created_at | timestamptz | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | timestamptz | NOT NULL | CURRENT_TIMESTAMP | 更新日時 |

```sql
-- インデックス
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- 外部キー制約
ALTER TABLE user_subscriptions ADD CONSTRAINT fk_user_subscriptions_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    
ALTER TABLE user_subscriptions ADD CONSTRAINT fk_user_subscriptions_plan 
    FOREIGN KEY (plan_id) REFERENCES plans(id);

-- Check制約
ALTER TABLE user_subscriptions ADD CONSTRAINT check_subscription_status 
    CHECK (status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'));
```

### 3.4 ログ・使用量管理テーブル

#### 3.4.1 ai_usage_logs (AI使用量ログテーブル)

| 項目名 | 型 | 制約 | デフォルト値 | 説明 |
|--------|----|----|-------------|------|
| id | uuid | PK | gen_random_uuid() | ログID |
| user_id | uuid | FK, NOT NULL | | ユーザーID |
| provider | varchar(20) | NOT NULL | | AIプロバイダー (openai/claude/gemini) |
| model | varchar(50) | | | 使用モデル |
| tokens_used | integer | | | 使用トークン数 |
| cost | decimal(10,4) | | | 使用コスト |
| created_at | timestamptz | NOT NULL | CURRENT_TIMESTAMP | 作成日時 |

```sql
-- インデックス
CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX idx_ai_usage_logs_provider ON ai_usage_logs(provider);

-- 外部キー制約
ALTER TABLE ai_usage_logs ADD CONSTRAINT fk_ai_usage_logs_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Check制約
ALTER TABLE ai_usage_logs ADD CONSTRAINT check_provider 
    CHECK (provider IN ('openai', 'claude', 'gemini'));

-- パーティション設定 (月別パーティション)
-- 大量ログデータ対応のため、必要に応じて実装
```

## 4. ビュー定義

### 4.1 user_plan_summary (ユーザープラン概要ビュー)

```sql
CREATE VIEW user_plan_summary AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.plan_type,
    u.plan_status,
    p.display_name as plan_display_name,
    p.price_monthly,
    us.status as subscription_status,
    us.current_period_end,
    us.trial_end,
    us.cancel_at_period_end
FROM users u
LEFT JOIN plans p ON u.plan_type = p.id
LEFT JOIN user_subscriptions us ON u.id = us.user_id 
    AND us.status IN ('active', 'trialing');
```

### 4.2 user_feature_access (ユーザー機能アクセス権ビュー)

```sql
CREATE VIEW user_feature_access AS
SELECT 
    u.id as user_id,
    u.email,
    u.plan_type,
    f.id as feature_id,
    f.display_name as feature_name,
    pf.enabled,
    pf.limit_value
FROM users u
CROSS JOIN features f
LEFT JOIN plan_features pf ON u.plan_type = pf.plan_id AND f.id = pf.feature_id
WHERE f.is_active = true;
```

### 4.3 ai_usage_monthly (月別AI使用量ビュー)

```sql
CREATE VIEW ai_usage_monthly AS
SELECT 
    user_id,
    DATE_TRUNC('month', created_at) as usage_month,
    provider,
    COUNT(*) as request_count,
    SUM(tokens_used) as total_tokens,
    SUM(cost) as total_cost
FROM ai_usage_logs
GROUP BY user_id, DATE_TRUNC('month', created_at), provider;
```

## 5. 関数・トリガー

### 5.1 更新日時自動更新トリガー

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

### 5.2 プラン変更時の整合性チェック関数

```sql
CREATE OR REPLACE FUNCTION check_plan_change_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- プラン変更時にサブスクリプションテーブルとの整合性をチェック
    IF NEW.plan_type != OLD.plan_type THEN
        -- プラン変更ログを記録（必要に応じて）
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values)
        VALUES (
            'users', 
            NEW.id, 
            'plan_change',
            jsonb_build_object('plan_type', OLD.plan_type),
            jsonb_build_object('plan_type', NEW.plan_type)
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_user_plan_change 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    WHEN (OLD.plan_type != NEW.plan_type)
    EXECUTE FUNCTION check_plan_change_consistency();
```

## 6. セキュリティ設定

### 6.1 Row Level Security (RLS)

```sql
-- users テーブルのRLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のレコードのみ参照可能
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = id);

-- ユーザーは自分のレコードのみ更新可能
CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = id);

-- user_subscriptions テーブルのRLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_subscriptions_select_own" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- ai_usage_logs テーブルのRLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_logs_select_own" ON ai_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ai_usage_logs_insert_own" ON ai_usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 6.2 権限設定

```sql
-- 読み取り専用ロール
CREATE ROLE readonly_user;
GRANT CONNECT ON DATABASE postgres TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- アプリケーション用ロール
CREATE ROLE app_user;
GRANT CONNECT ON DATABASE postgres TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
GRANT SELECT ON plans, features, plan_features TO app_user;
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO app_user;
GRANT SELECT, INSERT ON ai_usage_logs TO app_user;
```

## 7. パフォーマンス最適化

### 7.1 インデックス戦略

```sql
-- 複合インデックス
CREATE INDEX idx_users_plan_status ON users(plan_type, plan_status);
CREATE INDEX idx_ai_usage_user_date ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_subscriptions_active ON user_subscriptions(user_id, status) 
    WHERE status IN ('active', 'trialing');

-- 部分インデックス（有効なレコードのみ）
CREATE INDEX idx_plans_active ON plans(id) WHERE is_active = true;
CREATE INDEX idx_features_active ON features(id) WHERE is_active = true;
```

### 7.2 定期メンテナンス

```sql
-- 統計情報更新
ANALYZE users;
ANALYZE user_subscriptions;
ANALYZE ai_usage_logs;

-- 古いログデータの削除（6ヶ月以上前）
DELETE FROM ai_usage_logs 
WHERE created_at < CURRENT_DATE - INTERVAL '6 months';

-- VACUUMによる領域回収
VACUUM ANALYZE ai_usage_logs;
```

## 8. バックアップ・復旧

### 8.1 バックアップ戦略
- **頻度**: 日次自動バックアップ（Supabase標準機能）
- **保持期間**: 30日間
- **重要データ**: users, user_subscriptions は優先復旧

### 8.2 災害復旧
- **RTO**: 4時間以内
- **RPO**: 24時間以内
- **復旧手順**: Supabase管理画面からのポイントインタイム復旧

## 9. 監視・アラート

### 9.1 監視項目
- テーブル使用量
- クエリパフォーマンス
- 接続数
- レプリケーション遅延

### 9.2 アラート設定
- ディスク使用量 > 80%
- 平均クエリ実行時間 > 1秒
- 同時接続数 > 上限の80%

## 10. 実装上のトラブルシューティング

### 10.1 よくある問題と解決策

#### 新規登録時の「null value in column "id"」エラー
```
Database error: {
  code: '23502',
  details: 'Failing row contains (null, test@example.com, Test User, free, ...)',
  message: 'null value in column "id" of relation "users" violates not-null constraint'
}
```

**原因:**
- auth.users.idを users.id として設定していない
- API呼び出し時に `userId` パラメータが未設定

**解決策:**
1. 認証成功後に `data.user.id` を確実に取得
2. API呼び出し時に `userId: data.user.id` を含める
3. users テーブル作成は認証完了後に実行

**実装例:**
```typescript
// 正しい実装パターン
const { data, error } = await supabase.auth.signUp({email, password});
if (data.user) {
  await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({
      userId: data.user.id, // ← 必須
      email: data.user.email,
      name: userName
    })
  });
}
```

#### 外部キー制約違反
**症状:** `Failing row contains (null, email, name, ...)`  
**対処:** 認証フロー完了後にusers テーブル作成を実行すること

### 10.2 データ整合性チェッククエリ
```sql
-- ユーザーテーブルとauth.usersの整合性確認
SELECT 
    u.id, 
    u.name,
    au.email,
    CASE WHEN au.id IS NULL THEN 'MISSING_AUTH_USER' ELSE 'OK' END as status
FROM users u 
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL;
```