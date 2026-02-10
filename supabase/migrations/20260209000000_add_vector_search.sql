-- ベクトル検索のためのマイグレーション

-- ===========================================
-- 1. pgvector 拡張を有効化
-- ===========================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ===========================================
-- 2. recipes テーブルに埋め込みカラム追加
-- ===========================================
-- gemini-embedding-001 の出力次元は 3072
ALTER TABLE recipes
ADD COLUMN title_embedding vector(3072);

-- 埋め込みが生成済みかどうかを追跡
ALTER TABLE recipes
ADD COLUMN embedding_generated_at TIMESTAMPTZ;

-- ===========================================
-- 3. ベクトル検索用インデックス
-- ===========================================
-- 注意: pgvector のインデックス (IVFFlat/HNSW) は 2000 次元が上限
-- gemini-embedding-001 は 3072 次元のため、インデックスなしで運用
-- 個人用レシピアプリ（~1000件程度）では exact search で十分高速

-- ===========================================
-- 4. ベクトル類似検索 RPC 関数
-- ===========================================
CREATE OR REPLACE FUNCTION search_recipes_by_embedding(
  p_user_id UUID,
  p_query_embedding vector(3072),
  p_match_threshold FLOAT DEFAULT 0.5,
  p_match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  url TEXT,
  image_url TEXT,
  source_name TEXT,
  memo TEXT,
  similarity FLOAT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    r.id,
    r.title,
    r.url,
    r.image_url,
    r.source_name,
    r.memo,
    (1 - (r.title_embedding <=> p_query_embedding))::FLOAT AS similarity
  FROM recipes r
  WHERE r.user_id = p_user_id
    AND r.title_embedding IS NOT NULL
    AND 1 - (r.title_embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY r.title_embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- 関数に対する実行権限を付与
GRANT EXECUTE ON FUNCTION search_recipes_by_embedding(UUID, vector, FLOAT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_recipes_by_embedding(UUID, vector, FLOAT, INT) TO service_role;
