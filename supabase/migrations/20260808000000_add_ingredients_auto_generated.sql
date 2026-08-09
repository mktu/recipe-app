-- 食材マスターに自動追加フラグを追加
-- Issue #148: auto-alias が追加した食材が needs_review=true で行き止まりになる問題の修正
--
-- 自動追加された食材は即座に有効（needs_review=false）にし、
-- 「自動追加だった」ことは auto_generated で識別する。
-- 事後監査（#150 の週次通知）はこのカラムを抽出条件に使う。

ALTER TABLE ingredients
ADD COLUMN auto_generated BOOLEAN DEFAULT FALSE;

-- 既存の食材は手動登録・初期データ扱い（auto_generated = FALSE）

COMMENT ON COLUMN ingredients.auto_generated IS 'auto-alias バッチによる自動追加かどうか（TRUE=自動、FALSE=手動/初期データ）';

-- 事後監査（自動追加食材の一覧取得）用インデックス
CREATE INDEX idx_ingredients_auto_generated
ON ingredients(auto_generated)
WHERE auto_generated = TRUE;
