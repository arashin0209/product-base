-- 最適化マイグレーション: auth.users参照と制約の完全設定
-- 作成日: 2025-09-05
-- 目的: 実際の実装状況に合わせたマイグレーション

-- 1. plan_featuresテーブルの複合主キー追加
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_pkey" PRIMARY KEY ("plan_id", "feature_id");

-- 2. auth.usersスキーマへの正しい外部キー制約追加
DO $$ BEGIN
  ALTER TABLE "user_subscriptions" ADD CONSTRAINT "fk_user_subscriptions_user" 
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "fk_ai_usage_logs_user"
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. その他の制約確保
DO $$ BEGIN
  ALTER TABLE "user_subscriptions" ADD CONSTRAINT "fk_user_subscriptions_plan"
    FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. 重要なインデックス作成
CREATE INDEX IF NOT EXISTS "idx_ai_usage_logs_user_date" ON "ai_usage_logs" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_user_status" ON "user_subscriptions" ("user_id", "status") WHERE "status" IN ('active', 'trialing');
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_stripe_id" ON "user_subscriptions" ("stripe_subscription_id") WHERE "stripe_subscription_id" IS NOT NULL;

-- 5. 基本データ投入（冪等）
INSERT INTO "plans" ("id", "name", "display_name", "price_monthly", "price_yearly", "is_active") 
VALUES 
  ('free', 'Free Plan', '無料プラン', 0.00, 0.00, true),
  ('gold', 'Gold Plan', 'ゴールドプラン', 980.00, 9800.00, true),
  ('platinum', 'Platinum Plan', 'プラチナプラン', 2980.00, 29800.00, true)
ON CONFLICT ("id") DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO "features" ("id", "name", "display_name", "description", "is_active")
VALUES
  ('ai_requests', 'AI Requests', 'AI機能', 'OpenAI/Claude/Geminiへのリクエスト機能', true),
  ('export_csv', 'Export CSV', 'CSVエクスポート', 'データのCSVエクスポート機能', true),
  ('custom_theme', 'Custom Theme', 'カスタムテーマ', 'UIテーマカスタマイズ機能', true),
  ('priority_support', 'Priority Support', '優先サポート', '優先的なカスタマーサポート', true),
  ('api_access', 'API Access', 'API アクセス', '外部APIアクセス機能', true)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "plan_features" ("plan_id", "feature_id", "enabled", "limit_value")
VALUES
  -- Free Plan
  ('free', 'ai_requests', false, 0),
  ('free', 'export_csv', false, 0),
  ('free', 'custom_theme', false, 0),
  ('free', 'priority_support', false, 0),
  ('free', 'api_access', false, 0),
  -- Gold Plan  
  ('gold', 'ai_requests', true, 1000),
  ('gold', 'export_csv', true, NULL),
  ('gold', 'custom_theme', true, NULL),
  ('gold', 'priority_support', false, 0),
  ('gold', 'api_access', false, 0),
  -- Platinum Plan
  ('platinum', 'ai_requests', true, NULL),
  ('platinum', 'export_csv', true, NULL),
  ('platinum', 'custom_theme', true, NULL),
  ('platinum', 'priority_support', true, NULL),
  ('platinum', 'api_access', true, NULL)
ON CONFLICT ("plan_id", "feature_id") DO UPDATE SET
  enabled = EXCLUDED.enabled,
  limit_value = EXCLUDED.limit_value,
  updated_at = CURRENT_TIMESTAMP;

-- 6. Stripe価格ID更新（実際の価格ID）
UPDATE "plans" SET 
  stripe_price_id = 'price_1S41LECirsKNr4lIr1M7MFAV',
  updated_at = CURRENT_TIMESTAMP
WHERE "id" = 'gold';

UPDATE "plans" SET 
  stripe_price_id = 'price_1S41J4CirsKNr4lIdYRmtcPP', 
  updated_at = CURRENT_TIMESTAMP
WHERE "id" = 'platinum';