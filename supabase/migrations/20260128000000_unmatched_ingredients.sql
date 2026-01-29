-- 未マッチ食材の記録テーブル
-- マッチングでヒットしなかった食材を記録し、後からエイリアス登録やLLMフォールバックの判断材料にする

CREATE TABLE unmatched_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_name TEXT NOT NULL,              -- 元の生の食材名（LLM出力そのまま）
  normalized_name TEXT NOT NULL,       -- 正規化後の名前
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,  -- どのレシピから来たか
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 分析用インデックス（normalized_nameで集計するため）
CREATE INDEX idx_unmatched_ingredients_normalized ON unmatched_ingredients(normalized_name);

-- recipe_idでの検索用
CREATE INDEX idx_unmatched_ingredients_recipe ON unmatched_ingredients(recipe_id);

-- RLS有効化（サーバーサイドのみアクセス）
ALTER TABLE unmatched_ingredients ENABLE ROW LEVEL SECURITY;

-- サービスロールのみ全操作可能
CREATE POLICY "Service role full access to unmatched_ingredients"
ON unmatched_ingredients
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE unmatched_ingredients IS '食材マッチングでヒットしなかった食材を記録。エイリアス登録やLLMフォールバック導入の判断材料として使用';
COMMENT ON COLUMN unmatched_ingredients.raw_name IS 'LLMが出力した元の食材名';
COMMENT ON COLUMN unmatched_ingredients.normalized_name IS '正規化処理後の食材名';
COMMENT ON COLUMN unmatched_ingredients.recipe_id IS '食材の出典レシピ（レシピ削除時にカスケード削除）';
