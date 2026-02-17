-- エイリアス自動生成機能のためのスキーマ変更
-- ADR-001: 食材マッチングの表記揺れ対応

-- ingredient_aliases に自動生成フラグと作成日時を追加
ALTER TABLE ingredient_aliases
ADD COLUMN auto_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();

-- 既存のエイリアスは手動登録扱い（auto_generated = FALSE）
-- created_at は NULL のまま（既存データは日時不明）

COMMENT ON COLUMN ingredient_aliases.auto_generated IS 'LLMによる自動生成かどうか（TRUE=自動、FALSE=手動）';
COMMENT ON COLUMN ingredient_aliases.created_at IS 'エイリアス登録日時';

-- 自動生成エイリアスの一覧取得用インデックス
CREATE INDEX idx_ingredient_aliases_auto_generated
ON ingredient_aliases(auto_generated)
WHERE auto_generated = TRUE;

-- ===========================================
-- 未マッチ食材の出現頻度取得用RPC
-- ===========================================
CREATE OR REPLACE FUNCTION get_unmatched_ingredient_counts(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  normalized_name TEXT,
  count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    normalized_name,
    COUNT(*) as count
  FROM unmatched_ingredients
  GROUP BY normalized_name
  ORDER BY count DESC, normalized_name
  LIMIT limit_count;
$$;

COMMENT ON FUNCTION get_unmatched_ingredient_counts IS '未マッチ食材を出現頻度順で取得（エイリアス自動生成バッチ用）';
