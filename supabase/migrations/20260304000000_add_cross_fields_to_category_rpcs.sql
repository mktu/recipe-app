-- get_recipes_few_ingredients に cooking_time_minutes を追加
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
  ingredient_count INTEGER,
  cooking_time_minutes INTEGER
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
    jsonb_array_length(r.ingredients_raw) AS ingredient_count,
    r.cooking_time_minutes
  FROM recipes r
  WHERE r.user_id = p_user_id
    AND r.ingredients_raw IS NOT NULL
  ORDER BY ingredient_count ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_recipes_few_ingredients(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recipes_few_ingredients(UUID, INTEGER) TO service_role;

-- get_recipes_short_cooking_time に ingredient_count を追加
DROP FUNCTION IF EXISTS get_recipes_short_cooking_time(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_recipes_short_cooking_time(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  url TEXT,
  image_url TEXT,
  source_name TEXT,
  cooking_time_minutes INTEGER,
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
    r.cooking_time_minutes,
    jsonb_array_length(r.ingredients_raw) AS ingredient_count
  FROM recipes r
  WHERE r.user_id = p_user_id
    AND r.cooking_time_minutes IS NOT NULL
  ORDER BY r.cooking_time_minutes ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_recipes_short_cooking_time(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recipes_short_cooking_time(UUID, INTEGER) TO service_role;
