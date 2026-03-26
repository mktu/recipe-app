-- onboarding_sessions テーブルに RLS を有効化
-- すべてのアクセスは Next.js API / Edge Function 経由でサービスロールキーを使用するため
-- service_role のみアクセスを許可する
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to onboarding_sessions"
  ON onboarding_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
