-- 不足している食材を追加
INSERT INTO ingredients (name, category, needs_review) VALUES
  ('レモン', 'その他', false),
  ('ごま', 'その他', false)
ON CONFLICT (name) DO NOTHING;

-- エイリアス追加
INSERT INTO ingredient_aliases (ingredient_id, alias)
SELECT id, alias FROM (
  VALUES
    -- にんにく系
    ((SELECT id FROM ingredients WHERE name = 'にんにく'), 'すりおろしニンニク'),
    ((SELECT id FROM ingredients WHERE name = 'にんにく'), 'にんにくチューブ'),
    ((SELECT id FROM ingredients WHERE name = 'にんにく'), 'おろしにんにく'),
    -- しょうが系
    ((SELECT id FROM ingredients WHERE name = 'しょうが'), 'すりおろし生姜'),
    ((SELECT id FROM ingredients WHERE name = 'しょうが'), '生姜チューブ'),
    ((SELECT id FROM ingredients WHERE name = 'しょうが'), 'おろししょうが'),
    ((SELECT id FROM ingredients WHERE name = 'しょうが'), 'おろし生姜'),
    -- レモン系
    ((SELECT id FROM ingredients WHERE name = 'レモン'), 'レモン汁'),
    ((SELECT id FROM ingredients WHERE name = 'レモン'), 'レモン果汁'),
    -- ごま系
    ((SELECT id FROM ingredients WHERE name = 'ごま'), '白いりごま'),
    ((SELECT id FROM ingredients WHERE name = 'ごま'), '白ごま'),
    ((SELECT id FROM ingredients WHERE name = 'ごま'), '黒ごま'),
    ((SELECT id FROM ingredients WHERE name = 'ごま'), 'いりごま'),
    ((SELECT id FROM ingredients WHERE name = 'ごま'), 'すりごま'),
    -- たまご系
    ((SELECT id FROM ingredients WHERE name = 'たまご'), '卵黄'),
    ((SELECT id FROM ingredients WHERE name = 'たまご'), '卵白')
) AS t(id, alias)
WHERE id IS NOT NULL
ON CONFLICT (alias) DO NOTHING;
