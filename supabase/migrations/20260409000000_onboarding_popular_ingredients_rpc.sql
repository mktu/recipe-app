-- オンボーディング用：カテゴリ別人気食材を取得するRPC
-- recipe_ingredients の出現頻度でランキングし、カテゴリ別上位N件を返す
-- parent_id IS NULL（親食材のみ）を対象にして粒度を揃える
CREATE OR REPLACE FUNCTION get_popular_ingredients_for_onboarding(
  p_per_category INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  recipe_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH ranked AS (
    SELECT
      i.id,
      i.name,
      i.category,
      COUNT(ri.recipe_id) AS recipe_count,
      ROW_NUMBER() OVER (
        PARTITION BY i.category
        ORDER BY COUNT(ri.recipe_id) DESC, i.name
      ) AS rn
    FROM ingredients i
    LEFT JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
    WHERE i.parent_id IS NULL
      AND i.category IS NOT NULL
      AND i.category != 'その他'
    GROUP BY i.id, i.name, i.category
  )
  SELECT id, name, category, recipe_count
  FROM ranked
  WHERE rn <= p_per_category
  ORDER BY category, recipe_count DESC, name;
$$;

GRANT EXECUTE ON FUNCTION get_popular_ingredients_for_onboarding(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_popular_ingredients_for_onboarding(INTEGER) TO authenticated;
