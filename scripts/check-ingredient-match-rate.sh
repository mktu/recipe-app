#!/bin/bash
# 食材マッチング率を確認するスクリプト
# Usage: ./scripts/check-ingredient-match-rate.sh

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

echo "=== 食材マッチング統計 ==="
echo ""

psql "$DB_URL" -t -c "
SELECT
  'マッチ数: ' || (SELECT COUNT(*) FROM recipe_ingredients) ||
  ', アンマッチ数: ' || (SELECT COUNT(*) FROM unmatched_ingredients) ||
  ', アンマッチ率: ' || COALESCE(
    ROUND(
      (SELECT COUNT(*) FROM unmatched_ingredients)::numeric /
      NULLIF((SELECT COUNT(*) FROM recipe_ingredients) + (SELECT COUNT(*) FROM unmatched_ingredients), 0) * 100,
      1
    )::text || '%',
    'N/A'
  );
"

echo ""
echo "=== よく出る未マッチ食材 TOP 20 ==="
echo ""

psql "$DB_URL" -c "
SELECT normalized_name AS \"食材名\", COUNT(*) AS \"出現回数\"
FROM unmatched_ingredients
GROUP BY normalized_name
ORDER BY COUNT(*) DESC
LIMIT 20;
"
