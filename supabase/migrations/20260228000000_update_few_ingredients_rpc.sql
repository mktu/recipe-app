-- 材料少なめRPC: ingredient_count を返すように更新（戻り型変更のため DROP → CREATE）
DROP FUNCTION IF EXISTS get_recipes_few_ingredients(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_recipes_few_ingredients(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  url TEXT,
  image_url TEXT,
  source_name TEXT,
  ingredient_count INTEGER
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
    jsonb_array_length(r.ingredients_raw) AS ingredient_count
  FROM recipes r
  WHERE r.user_id = p_user_id
    AND r.ingredients_raw IS NOT NULL
  ORDER BY ingredient_count ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_recipes_few_ingredients(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recipes_few_ingredients(UUID, INTEGER) TO service_role;
