-- Issue #79: オンボーディング機能の削除（著作権リスク対応）
DROP TABLE IF EXISTS onboarding_sessions;

ALTER TABLE users DROP COLUMN IF EXISTS onboarding_completed_at;

DROP FUNCTION IF EXISTS get_popular_ingredients_for_onboarding(integer);
