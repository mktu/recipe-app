-- 開発用シードデータ
-- ローカル開発環境でのみ使用（supabase db reset で自動適用）
-- 本番に必要なマスターデータはマイグレーションで管理

-- 開発用ユーザー
INSERT INTO users (line_user_id, display_name) VALUES
  ('dev-user-001', '開発ユーザー')
ON CONFLICT (line_user_id) DO NOTHING;
