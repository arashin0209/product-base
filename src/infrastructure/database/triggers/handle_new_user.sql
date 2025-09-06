-- auth.users作成時にpublic.usersレコードを自動作成するトリガー
-- Google認証等で新規ユーザーが作成された際に、確実にアプリケーション用ユーザーレコードを作成

-- トリガー関数の作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, plan_id, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',     -- Google認証の場合
      NEW.raw_user_meta_data->>'name',          -- その他のOAuth
      split_part(NEW.email, '@', 1)             -- メールアドレスのローカル部分をフォールバック
    ),
    'free',  -- デフォルトプラン
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- 既に存在する場合は何もしない（重複実行対応）
    RETURN NEW;
  WHEN OTHERS THEN
    -- エラーログを記録（必要に応じて）
    RAISE LOG 'Error creating user record for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 既存のauth.usersに対してpublic.usersレコードを作成（初回セットアップ用）
INSERT INTO public.users (id, name, plan_id, created_at, updated_at)
SELECT 
  id,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name', 
    split_part(email, '@', 1)
  ),
  'free',
  created_at,
  updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;