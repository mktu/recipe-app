-- 埋め込み生成のリトライ回数を記録するカラムを追加
-- 一定回数失敗したレシピは処理対象から除外する

ALTER TABLE recipes
ADD COLUMN embedding_retry_count INTEGER DEFAULT 0;

-- リトライ回数が上限に達していないレシピのみを対象にするためのコメント
COMMENT ON COLUMN recipes.embedding_retry_count IS '埋め込み生成の失敗回数。3回以上で処理対象から除外';
