-- 食材マッチング・検索精度改善
-- 1. recipes テーブルに食材リンク状態カラム追加
-- 2. ingredients テーブルに親子関係カラム追加

-- ===========================================
-- 1. recipes テーブル: 食材リンク状態
-- ===========================================
ALTER TABLE recipes
ADD COLUMN ingredients_linked BOOLEAN DEFAULT FALSE;

-- 既存レシピは未リンク状態（開発環境のみなので影響なし）
COMMENT ON COLUMN recipes.ingredients_linked IS '食材マッチングが完了したかどうか';

-- ===========================================
-- 2. ingredients テーブル: 親子関係
-- ===========================================
ALTER TABLE ingredients
ADD COLUMN parent_id UUID REFERENCES ingredients(id) ON DELETE SET NULL;

CREATE INDEX idx_ingredients_parent_id ON ingredients(parent_id);

COMMENT ON COLUMN ingredients.parent_id IS '親食材のID（例: 豚バラ肉 → 豚肉）';
