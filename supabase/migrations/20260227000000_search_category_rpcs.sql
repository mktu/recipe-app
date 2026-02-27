-- 材料少なめレシピを取得するRPC関数（ingredients_raw の配列長でソート）
CREATE OR REPLACE FUNCTION get_recipes_few_ingredients(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  url TEXT,
  image_url TEXT,
  source_name TEXT
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
    r.source_name
  FROM recipes r
  WHERE r.user_id = p_user_id
  ORDER BY jsonb_array_length(r.ingredients_raw) ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_recipes_few_ingredients(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recipes_few_ingredients(UUID, INTEGER) TO service_role;

-- 時短レシピを取得するRPC関数（cooking_time_minutes ASC、NULL除外）
CREATE OR REPLACE FUNCTION get_recipes_short_cooking_time(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  url TEXT,
  image_url TEXT,
  source_name TEXT
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
    r.source_name
  FROM recipes r
  WHERE r.user_id = p_user_id
    AND r.cooking_time_minutes IS NOT NULL
  ORDER BY r.cooking_time_minutes ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_recipes_short_cooking_time(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recipes_short_cooking_time(UUID, INTEGER) TO service_role;
