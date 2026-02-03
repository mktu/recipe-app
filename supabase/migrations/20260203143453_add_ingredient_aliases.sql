-- ===========================================
-- エイリアス（表記揺れ対応）
-- 食材が存在しない場合はスキップ（ローカル環境対応）
-- ===========================================

-- 野菜
INSERT INTO ingredient_aliases (alias, ingredient_id)
SELECT alias, id FROM (
  VALUES
    ('玉ねぎ', 'たまねぎ'),
    ('玉葱', 'たまねぎ'),
    ('タマネギ', 'たまねぎ'),
    ('玉ネギ', 'たまねぎ'),
    ('人参', 'にんじん'),
    ('ニンジン', 'にんじん'),
    ('だいこん', '大根'),
    ('ダイコン', '大根'),
    ('はくさい', '白菜'),
    ('ハクサイ', '白菜'),
    ('ほうれんそう', 'ほうれん草'),
    ('ホウレンソウ', 'ほうれん草'),
    ('ホウレン草', 'ほうれん草'),
    ('こまつな', '小松菜'),
    ('コマツナ', '小松菜'),
    ('チンゲンサイ', 'チンゲン菜'),
    ('青梗菜', 'チンゲン菜'),
    ('ちんげんさい', 'チンゲン菜'),
    ('みずな', '水菜'),
    ('ミズナ', '水菜'),
    ('しゅんぎく', '春菊'),
    ('シュンギク', '春菊'),
    ('さといも', '里芋'),
    ('サトイモ', '里芋'),
    ('ねぎ', '長ねぎ'),
    ('ネギ', '長ねぎ'),
    ('葱', '長ねぎ'),
    ('長葱', '長ねぎ'),
    ('ながねぎ', '長ねぎ'),
    ('生姜', 'しょうが'),
    ('ショウガ', 'しょうが'),
    ('ニンニク', 'にんにく'),
    ('大蒜', 'にんにく'),
    ('しそ', '大葉'),
    ('シソ', '大葉'),
    ('紫蘇', '大葉'),
    ('青じそ', '大葉'),
    ('みつば', '三つ葉'),
    ('ミツバ', '三つ葉'),
    ('かいわれ', '貝割れ大根'),
    ('カイワレ', '貝割れ大根'),
    ('かいわれ大根', '貝割れ大根'),
    ('えだまめ', '枝豆'),
    ('エダマメ', '枝豆'),
    ('そらまめ', 'そら豆'),
    ('ソラマメ', 'そら豆'),
    ('空豆', 'そら豆'),
    ('切干大根', '切り干し大根'),
    ('きりぼしだいこん', '切り干し大根')
) AS v(alias, ingredient_name)
JOIN ingredients i ON i.name = v.ingredient_name
ON CONFLICT (alias) DO NOTHING;

-- 肉
INSERT INTO ingredient_aliases (alias, ingredient_id)
SELECT alias, id FROM (
  VALUES
    ('とり肉', '鶏肉'),
    ('とりにく', '鶏肉'),
    ('チキン', '鶏肉'),
    ('鶏胸肉', '鶏むね肉'),
    ('とりむね', '鶏むね肉'),
    ('とりむね肉', '鶏むね肉'),
    ('鶏腿肉', '鶏もも肉'),
    ('とりもも', '鶏もも肉'),
    ('とりもも肉', '鶏もも肉'),
    ('ささみ', '鶏ささみ'),
    ('ササミ', '鶏ささみ'),
    ('とりささみ', '鶏ささみ'),
    ('とりひき肉', '鶏ひき肉'),
    ('鶏挽肉', '鶏ひき肉'),
    ('鶏挽き肉', '鶏ひき肉'),
    ('豚こま肉', '豚こま切れ肉'),
    ('豚こま', '豚こま切れ肉'),
    ('豚小間肉', '豚こま切れ肉'),
    ('豚挽肉', '豚ひき肉'),
    ('豚挽き肉', '豚ひき肉'),
    ('牛こま肉', '牛こま切れ肉'),
    ('牛こま', '牛こま切れ肉'),
    ('牛挽肉', '牛ひき肉'),
    ('牛挽き肉', '牛ひき肉'),
    ('合挽肉', '合いびき肉'),
    ('合い挽き肉', '合いびき肉'),
    ('合挽き肉', '合いびき肉'),
    ('ひき肉', '合いびき肉'),
    ('挽肉', '合いびき肉'),
    ('挽き肉', '合いびき肉'),
    ('ミンチ', '合いびき肉'),
    ('ウインナー', 'ソーセージ'),
    ('ウィンナー', 'ソーセージ')
) AS v(alias, ingredient_name)
JOIN ingredients i ON i.name = v.ingredient_name
ON CONFLICT (alias) DO NOTHING;

-- 魚介
INSERT INTO ingredient_aliases (alias, ingredient_id)
SELECT alias, id FROM (
  VALUES
    ('サーモン', '鮭'),
    ('さけ', '鮭'),
    ('シャケ', '鮭'),
    ('エビ', 'えび'),
    ('海老', 'えび'),
    ('蝦', 'えび'),
    ('イカ', 'いか'),
    ('烏賊', 'いか'),
    ('タコ', 'たこ'),
    ('蛸', 'たこ'),
    ('ホタテ', 'ほたて'),
    ('帆立', 'ほたて'),
    ('カニ', 'かに'),
    ('蟹', 'かに'),
    ('ツナ', 'ツナ缶'),
    ('シーチキン', 'ツナ缶')
) AS v(alias, ingredient_name)
JOIN ingredients i ON i.name = v.ingredient_name
ON CONFLICT (alias) DO NOTHING;

-- 卵・乳製品
INSERT INTO ingredient_aliases (alias, ingredient_id)
SELECT alias, id FROM (
  VALUES
    ('卵', 'たまご'),
    ('玉子', 'たまご'),
    ('タマゴ', 'たまご'),
    ('鶏卵', 'たまご')
) AS v(alias, ingredient_name)
JOIN ingredients i ON i.name = v.ingredient_name
ON CONFLICT (alias) DO NOTHING;

-- 豆腐・大豆製品
INSERT INTO ingredient_aliases (alias, ingredient_id)
SELECT alias, id FROM (
  VALUES
    ('とうふ', '豆腐'),
    ('トウフ', '豆腐'),
    ('あぶらあげ', '油揚げ'),
    ('あげ', '油揚げ'),
    ('揚げ', '油揚げ'),
    ('あつあげ', '厚揚げ'),
    ('生揚げ', '厚揚げ')
) AS v(alias, ingredient_name)
JOIN ingredients i ON i.name = v.ingredient_name
ON CONFLICT (alias) DO NOTHING;

-- 穀物・麺類
INSERT INTO ingredient_aliases (alias, ingredient_id)
SELECT alias, id FROM (
  VALUES
    ('ご飯', 'ごはん'),
    ('米', 'ごはん'),
    ('白米', 'ごはん'),
    ('ライス', 'ごはん'),
    ('もち', '餅'),
    ('モチ', '餅'),
    ('お餅', '餅'),
    ('スパゲティ', 'パスタ'),
    ('スパゲッティ', 'パスタ')
) AS v(alias, ingredient_name)
JOIN ingredients i ON i.name = v.ingredient_name
ON CONFLICT (alias) DO NOTHING;

-- その他
INSERT INTO ingredient_aliases (alias, ingredient_id)
SELECT alias, id FROM (
  VALUES
    ('蒟蒻', 'こんにゃく'),
    ('コンニャク', 'こんにゃく'),
    ('ワカメ', 'わかめ'),
    ('若布', 'わかめ'),
    ('ヒジキ', 'ひじき'),
    ('こんぶ', '昆布'),
    ('コンブ', '昆布')
) AS v(alias, ingredient_name)
JOIN ingredients i ON i.name = v.ingredient_name
ON CONFLICT (alias) DO NOTHING;
