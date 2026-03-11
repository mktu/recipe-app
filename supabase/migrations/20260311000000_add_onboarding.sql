-- users テーブルにオンボーディング完了フラグ追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- 既存ユーザーは完了済み扱い（既存ユーザーには表示しない）
UPDATE users SET onboarding_completed_at = now() WHERE onboarding_completed_at IS NULL;

-- オンボーディングセッション一時保存テーブル
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  preferences jsonb NOT NULL,   -- { searchQuery, dislikedIngredients, maxCookingMinutes }
  candidates jsonb,             -- 収集結果（完了後に格納）
  status text DEFAULT 'pending', -- pending / completed / failed
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '24 hours'
);
