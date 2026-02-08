-- ユーザーの登録レシピに多く使われている食材を取得するRPC関数
CREATE OR REPLACE FUNCTION get_frequent_ingredients(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  recipe_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    i.id,
    i.name,
    COUNT(*) as recipe_count
  FROM recipe_ingredients ri
  JOIN recipes r ON ri.recipe_id = r.id
  JOIN ingredients i ON ri.ingredient_id = i.id
  WHERE r.user_id = p_user_id
  GROUP BY i.id, i.name
  ORDER BY recipe_count DESC
  LIMIT p_limit;
$$;

-- 関数に対する実行権限を付与
GRANT EXECUTE ON FUNCTION get_frequent_ingredients(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_frequent_ingredients(UUID, INTEGER) TO service_role;
