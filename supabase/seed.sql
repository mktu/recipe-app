-- 開発用ユーザー
INSERT INTO users (line_user_id, display_name) VALUES
  ('dev-user-001', '開発ユーザー')
ON CONFLICT (line_user_id) DO NOTHING;

-- 食材マスターのシードデータ
-- seed/ingredients.json から生成

-- 野菜（50件）
INSERT INTO ingredients (name, category) VALUES
  ('なす', '野菜'),
  ('きゅうり', '野菜'),
  ('トマト', '野菜'),
  ('ミニトマト', '野菜'),
  ('にんじん', '野菜'),
  ('たまねぎ', '野菜'),
  ('じゃがいも', '野菜'),
  ('さつまいも', '野菜'),
  ('里芋', '野菜'),
  ('大根', '野菜'),
  ('かぶ', '野菜'),
  ('れんこん', '野菜'),
  ('ごぼう', '野菜'),
  ('キャベツ', '野菜'),
  ('白菜', '野菜'),
  ('レタス', '野菜'),
  ('ほうれん草', '野菜'),
  ('小松菜', '野菜'),
  ('チンゲン菜', '野菜'),
  ('水菜', '野菜'),
  ('春菊', '野菜'),
  ('もやし', '野菜'),
  ('ブロッコリー', '野菜'),
  ('カリフラワー', '野菜'),
  ('アスパラガス', '野菜'),
  ('ピーマン', '野菜'),
  ('パプリカ', '野菜'),
  ('ししとう', '野菜'),
  ('かぼちゃ', '野菜'),
  ('ズッキーニ', '野菜'),
  ('ゴーヤ', '野菜'),
  ('オクラ', '野菜'),
  ('とうもろこし', '野菜'),
  ('枝豆', '野菜'),
  ('そら豆', '野菜'),
  ('さやいんげん', '野菜'),
  ('スナップエンドウ', '野菜'),
  ('長ねぎ', '野菜'),
  ('にら', '野菜'),
  ('セロリ', '野菜'),
  ('みょうが', '野菜'),
  ('しょうが', '野菜'),
  ('にんにく', '野菜'),
  ('大葉', '野菜'),
  ('三つ葉', '野菜'),
  ('パセリ', '野菜'),
  ('バジル', '野菜'),
  ('貝割れ大根', '野菜'),
  ('豆苗', '野菜'),
  ('もやし', '野菜')
ON CONFLICT (name) DO NOTHING;

-- きのこ（8件）
INSERT INTO ingredients (name, category) VALUES
  ('しいたけ', 'きのこ'),
  ('しめじ', 'きのこ'),
  ('えのき', 'きのこ'),
  ('まいたけ', 'きのこ'),
  ('エリンギ', 'きのこ'),
  ('なめこ', 'きのこ'),
  ('マッシュルーム', 'きのこ'),
  ('きくらげ', 'きのこ')
ON CONFLICT (name) DO NOTHING;

-- 肉（20件）
INSERT INTO ingredients (name, category) VALUES
  ('鶏肉', '肉'),
  ('鶏むね肉', '肉'),
  ('鶏もも肉', '肉'),
  ('鶏ささみ', '肉'),
  ('鶏手羽先', '肉'),
  ('鶏手羽元', '肉'),
  ('鶏ひき肉', '肉'),
  ('豚肉', '肉'),
  ('豚バラ肉', '肉'),
  ('豚ロース', '肉'),
  ('豚こま切れ肉', '肉'),
  ('豚ひき肉', '肉'),
  ('牛肉', '肉'),
  ('牛薄切り肉', '肉'),
  ('牛こま切れ肉', '肉'),
  ('牛ひき肉', '肉'),
  ('合いびき肉', '肉'),
  ('ベーコン', '肉'),
  ('ハム', '肉'),
  ('ソーセージ', '肉')
ON CONFLICT (name) DO NOTHING;

-- 魚介（27件）
INSERT INTO ingredients (name, category) VALUES
  ('鮭', '魚介'),
  ('さば', '魚介'),
  ('さんま', '魚介'),
  ('あじ', '魚介'),
  ('いわし', '魚介'),
  ('ぶり', '魚介'),
  ('たら', '魚介'),
  ('かれい', '魚介'),
  ('めかじき', '魚介'),
  ('まぐろ', '魚介'),
  ('かつお', '魚介'),
  ('たい', '魚介'),
  ('えび', '魚介'),
  ('いか', '魚介'),
  ('たこ', '魚介'),
  ('あさり', '魚介'),
  ('しじみ', '魚介'),
  ('ほたて', '魚介'),
  ('かに', '魚介'),
  ('ツナ缶', '魚介'),
  ('さば缶', '魚介'),
  ('鮭フレーク', '魚介'),
  ('しらす', '魚介'),
  ('ちりめんじゃこ', '魚介'),
  ('干しえび', '魚介'),
  ('たらこ', '魚介'),
  ('明太子', '魚介')
ON CONFLICT (name) DO NOTHING;

-- 卵・乳製品（7件）
INSERT INTO ingredients (name, category) VALUES
  ('たまご', '卵・乳製品'),
  ('牛乳', '卵・乳製品'),
  ('生クリーム', '卵・乳製品'),
  ('バター', '卵・乳製品'),
  ('チーズ', '卵・乳製品'),
  ('ヨーグルト', '卵・乳製品'),
  ('スライスチーズ', '卵・乳製品')
ON CONFLICT (name) DO NOTHING;

-- 豆腐・大豆製品（11件）
INSERT INTO ingredients (name, category) VALUES
  ('豆腐', '豆腐・大豆製品'),
  ('木綿豆腐', '豆腐・大豆製品'),
  ('絹ごし豆腐', '豆腐・大豆製品'),
  ('厚揚げ', '豆腐・大豆製品'),
  ('油揚げ', '豆腐・大豆製品'),
  ('がんもどき', '豆腐・大豆製品'),
  ('高野豆腐', '豆腐・大豆製品'),
  ('納豆', '豆腐・大豆製品'),
  ('豆乳', '豆腐・大豆製品'),
  ('おから', '豆腐・大豆製品'),
  ('大豆', '豆腐・大豆製品')
ON CONFLICT (name) DO NOTHING;

-- 穀物・麺類（10件）
INSERT INTO ingredients (name, category) VALUES
  ('ごはん', '穀物・麺類'),
  ('うどん', '穀物・麺類'),
  ('そば', '穀物・麺類'),
  ('そうめん', '穀物・麺類'),
  ('パスタ', '穀物・麺類'),
  ('中華麺', '穀物・麺類'),
  ('春雨', '穀物・麺類'),
  ('ビーフン', '穀物・麺類'),
  ('餅', '穀物・麺類'),
  ('食パン', '穀物・麺類')
ON CONFLICT (name) DO NOTHING;

-- その他（19件）
INSERT INTO ingredients (name, category) VALUES
  ('こんにゃく', 'その他'),
  ('しらたき', 'その他'),
  ('わかめ', 'その他'),
  ('ひじき', 'その他'),
  ('昆布', 'その他'),
  ('のり', 'その他'),
  ('切り干し大根', 'その他'),
  ('かんぴょう', 'その他'),
  ('アボカド', 'その他'),
  ('梅干し', 'その他'),
  ('キムチ', 'その他'),
  ('漬物', 'その他'),
  ('ちくわ', 'その他'),
  ('はんぺん', 'その他'),
  ('かまぼこ', 'その他'),
  ('さつま揚げ', 'その他'),
  ('餃子の皮', 'その他'),
  ('春巻きの皮', 'その他'),
  ('ワンタンの皮', 'その他')
ON CONFLICT (name) DO NOTHING;

-- ===========================================
-- 親子関係の設定
-- 親食材で検索すると子食材もヒットするようにする
-- ===========================================

-- 鶏肉の子食材
UPDATE ingredients SET parent_id = (SELECT id FROM ingredients WHERE name = '鶏肉')
WHERE name IN ('鶏むね肉', '鶏もも肉', '鶏ささみ', '鶏手羽先', '鶏手羽元', '鶏ひき肉');

-- 豚肉の子食材
UPDATE ingredients SET parent_id = (SELECT id FROM ingredients WHERE name = '豚肉')
WHERE name IN ('豚バラ肉', '豚ロース', '豚こま切れ肉', '豚ひき肉');

-- 牛肉の子食材
UPDATE ingredients SET parent_id = (SELECT id FROM ingredients WHERE name = '牛肉')
WHERE name IN ('牛薄切り肉', '牛こま切れ肉', '牛ひき肉');

-- 豆腐の子食材
UPDATE ingredients SET parent_id = (SELECT id FROM ingredients WHERE name = '豆腐')
WHERE name IN ('木綿豆腐', '絹ごし豆腐', '高野豆腐');

-- トマトの子食材
UPDATE ingredients SET parent_id = (SELECT id FROM ingredients WHERE name = 'トマト')
WHERE name = 'ミニトマト';

-- ===========================================
-- エイリアス（表記揺れ対応）
-- ===========================================

-- 野菜
INSERT INTO ingredient_aliases (alias, ingredient_id) VALUES
  -- たまねぎ
  ('玉ねぎ', (SELECT id FROM ingredients WHERE name = 'たまねぎ')),
  ('玉葱', (SELECT id FROM ingredients WHERE name = 'たまねぎ')),
  ('タマネギ', (SELECT id FROM ingredients WHERE name = 'たまねぎ')),
  ('玉ネギ', (SELECT id FROM ingredients WHERE name = 'たまねぎ')),
  -- にんじん
  ('人参', (SELECT id FROM ingredients WHERE name = 'にんじん')),
  ('ニンジン', (SELECT id FROM ingredients WHERE name = 'にんじん')),
  -- 大根
  ('だいこん', (SELECT id FROM ingredients WHERE name = '大根')),
  ('ダイコン', (SELECT id FROM ingredients WHERE name = '大根')),
  -- 白菜
  ('はくさい', (SELECT id FROM ingredients WHERE name = '白菜')),
  ('ハクサイ', (SELECT id FROM ingredients WHERE name = '白菜')),
  -- ほうれん草
  ('ほうれんそう', (SELECT id FROM ingredients WHERE name = 'ほうれん草')),
  ('ホウレンソウ', (SELECT id FROM ingredients WHERE name = 'ほうれん草')),
  ('ホウレン草', (SELECT id FROM ingredients WHERE name = 'ほうれん草')),
  -- 小松菜
  ('こまつな', (SELECT id FROM ingredients WHERE name = '小松菜')),
  ('コマツナ', (SELECT id FROM ingredients WHERE name = '小松菜')),
  -- チンゲン菜
  ('チンゲンサイ', (SELECT id FROM ingredients WHERE name = 'チンゲン菜')),
  ('青梗菜', (SELECT id FROM ingredients WHERE name = 'チンゲン菜')),
  ('ちんげんさい', (SELECT id FROM ingredients WHERE name = 'チンゲン菜')),
  -- 水菜
  ('みずな', (SELECT id FROM ingredients WHERE name = '水菜')),
  ('ミズナ', (SELECT id FROM ingredients WHERE name = '水菜')),
  -- 春菊
  ('しゅんぎく', (SELECT id FROM ingredients WHERE name = '春菊')),
  ('シュンギク', (SELECT id FROM ingredients WHERE name = '春菊')),
  -- 里芋
  ('さといも', (SELECT id FROM ingredients WHERE name = '里芋')),
  ('サトイモ', (SELECT id FROM ingredients WHERE name = '里芋')),
  -- 長ねぎ
  ('ねぎ', (SELECT id FROM ingredients WHERE name = '長ねぎ')),
  ('ネギ', (SELECT id FROM ingredients WHERE name = '長ねぎ')),
  ('葱', (SELECT id FROM ingredients WHERE name = '長ねぎ')),
  ('長葱', (SELECT id FROM ingredients WHERE name = '長ねぎ')),
  ('ながねぎ', (SELECT id FROM ingredients WHERE name = '長ねぎ')),
  -- しょうが
  ('生姜', (SELECT id FROM ingredients WHERE name = 'しょうが')),
  ('ショウガ', (SELECT id FROM ingredients WHERE name = 'しょうが')),
  -- にんにく
  ('ニンニク', (SELECT id FROM ingredients WHERE name = 'にんにく')),
  ('大蒜', (SELECT id FROM ingredients WHERE name = 'にんにく')),
  -- 大葉
  ('しそ', (SELECT id FROM ingredients WHERE name = '大葉')),
  ('シソ', (SELECT id FROM ingredients WHERE name = '大葉')),
  ('紫蘇', (SELECT id FROM ingredients WHERE name = '大葉')),
  ('青じそ', (SELECT id FROM ingredients WHERE name = '大葉')),
  -- 三つ葉
  ('みつば', (SELECT id FROM ingredients WHERE name = '三つ葉')),
  ('ミツバ', (SELECT id FROM ingredients WHERE name = '三つ葉')),
  -- 貝割れ大根
  ('かいわれ', (SELECT id FROM ingredients WHERE name = '貝割れ大根')),
  ('カイワレ', (SELECT id FROM ingredients WHERE name = '貝割れ大根')),
  ('かいわれ大根', (SELECT id FROM ingredients WHERE name = '貝割れ大根')),
  -- 枝豆
  ('えだまめ', (SELECT id FROM ingredients WHERE name = '枝豆')),
  ('エダマメ', (SELECT id FROM ingredients WHERE name = '枝豆')),
  -- そら豆
  ('そらまめ', (SELECT id FROM ingredients WHERE name = 'そら豆')),
  ('ソラマメ', (SELECT id FROM ingredients WHERE name = 'そら豆')),
  ('空豆', (SELECT id FROM ingredients WHERE name = 'そら豆')),
  -- 切り干し大根
  ('切干大根', (SELECT id FROM ingredients WHERE name = '切り干し大根')),
  ('きりぼしだいこん', (SELECT id FROM ingredients WHERE name = '切り干し大根'))
ON CONFLICT (alias) DO NOTHING;

-- 肉
INSERT INTO ingredient_aliases (alias, ingredient_id) VALUES
  -- 鶏肉
  ('とり肉', (SELECT id FROM ingredients WHERE name = '鶏肉')),
  ('とりにく', (SELECT id FROM ingredients WHERE name = '鶏肉')),
  ('チキン', (SELECT id FROM ingredients WHERE name = '鶏肉')),
  -- 鶏むね肉
  ('鶏胸肉', (SELECT id FROM ingredients WHERE name = '鶏むね肉')),
  ('とりむね', (SELECT id FROM ingredients WHERE name = '鶏むね肉')),
  ('とりむね肉', (SELECT id FROM ingredients WHERE name = '鶏むね肉')),
  -- 鶏もも肉
  ('鶏腿肉', (SELECT id FROM ingredients WHERE name = '鶏もも肉')),
  ('とりもも', (SELECT id FROM ingredients WHERE name = '鶏もも肉')),
  ('とりもも肉', (SELECT id FROM ingredients WHERE name = '鶏もも肉')),
  -- 鶏ささみ
  ('ささみ', (SELECT id FROM ingredients WHERE name = '鶏ささみ')),
  ('ササミ', (SELECT id FROM ingredients WHERE name = '鶏ささみ')),
  ('とりささみ', (SELECT id FROM ingredients WHERE name = '鶏ささみ')),
  -- 鶏ひき肉
  ('とりひき肉', (SELECT id FROM ingredients WHERE name = '鶏ひき肉')),
  ('鶏挽肉', (SELECT id FROM ingredients WHERE name = '鶏ひき肉')),
  ('鶏挽き肉', (SELECT id FROM ingredients WHERE name = '鶏ひき肉')),
  -- 豚こま切れ肉
  ('豚こま肉', (SELECT id FROM ingredients WHERE name = '豚こま切れ肉')),
  ('豚こま', (SELECT id FROM ingredients WHERE name = '豚こま切れ肉')),
  ('豚小間肉', (SELECT id FROM ingredients WHERE name = '豚こま切れ肉')),
  -- 豚ひき肉
  ('豚挽肉', (SELECT id FROM ingredients WHERE name = '豚ひき肉')),
  ('豚挽き肉', (SELECT id FROM ingredients WHERE name = '豚ひき肉')),
  -- 牛こま切れ肉
  ('牛こま肉', (SELECT id FROM ingredients WHERE name = '牛こま切れ肉')),
  ('牛こま', (SELECT id FROM ingredients WHERE name = '牛こま切れ肉')),
  -- 牛ひき肉
  ('牛挽肉', (SELECT id FROM ingredients WHERE name = '牛ひき肉')),
  ('牛挽き肉', (SELECT id FROM ingredients WHERE name = '牛ひき肉')),
  -- 合いびき肉
  ('合挽肉', (SELECT id FROM ingredients WHERE name = '合いびき肉')),
  ('合い挽き肉', (SELECT id FROM ingredients WHERE name = '合いびき肉')),
  ('合挽き肉', (SELECT id FROM ingredients WHERE name = '合いびき肉')),
  ('ひき肉', (SELECT id FROM ingredients WHERE name = '合いびき肉')),
  ('挽肉', (SELECT id FROM ingredients WHERE name = '合いびき肉')),
  ('挽き肉', (SELECT id FROM ingredients WHERE name = '合いびき肉')),
  ('ミンチ', (SELECT id FROM ingredients WHERE name = '合いびき肉')),
  -- ソーセージ
  ('ウインナー', (SELECT id FROM ingredients WHERE name = 'ソーセージ')),
  ('ウィンナー', (SELECT id FROM ingredients WHERE name = 'ソーセージ'))
ON CONFLICT (alias) DO NOTHING;

-- 魚介
INSERT INTO ingredient_aliases (alias, ingredient_id) VALUES
  -- 鮭
  ('サーモン', (SELECT id FROM ingredients WHERE name = '鮭')),
  ('さけ', (SELECT id FROM ingredients WHERE name = '鮭')),
  ('シャケ', (SELECT id FROM ingredients WHERE name = '鮭')),
  -- えび
  ('エビ', (SELECT id FROM ingredients WHERE name = 'えび')),
  ('海老', (SELECT id FROM ingredients WHERE name = 'えび')),
  ('蝦', (SELECT id FROM ingredients WHERE name = 'えび')),
  -- いか
  ('イカ', (SELECT id FROM ingredients WHERE name = 'いか')),
  ('烏賊', (SELECT id FROM ingredients WHERE name = 'いか')),
  -- たこ
  ('タコ', (SELECT id FROM ingredients WHERE name = 'たこ')),
  ('蛸', (SELECT id FROM ingredients WHERE name = 'たこ')),
  -- ほたて
  ('ホタテ', (SELECT id FROM ingredients WHERE name = 'ほたて')),
  ('帆立', (SELECT id FROM ingredients WHERE name = 'ほたて')),
  -- かに
  ('カニ', (SELECT id FROM ingredients WHERE name = 'かに')),
  ('蟹', (SELECT id FROM ingredients WHERE name = 'かに')),
  -- ツナ缶
  ('ツナ', (SELECT id FROM ingredients WHERE name = 'ツナ缶')),
  ('シーチキン', (SELECT id FROM ingredients WHERE name = 'ツナ缶'))
ON CONFLICT (alias) DO NOTHING;

-- 卵・乳製品
INSERT INTO ingredient_aliases (alias, ingredient_id) VALUES
  -- たまご
  ('卵', (SELECT id FROM ingredients WHERE name = 'たまご')),
  ('玉子', (SELECT id FROM ingredients WHERE name = 'たまご')),
  ('タマゴ', (SELECT id FROM ingredients WHERE name = 'たまご')),
  ('鶏卵', (SELECT id FROM ingredients WHERE name = 'たまご'))
ON CONFLICT (alias) DO NOTHING;

-- 豆腐・大豆製品
INSERT INTO ingredient_aliases (alias, ingredient_id) VALUES
  -- 豆腐
  ('とうふ', (SELECT id FROM ingredients WHERE name = '豆腐')),
  ('トウフ', (SELECT id FROM ingredients WHERE name = '豆腐')),
  -- 油揚げ
  ('あぶらあげ', (SELECT id FROM ingredients WHERE name = '油揚げ')),
  ('あげ', (SELECT id FROM ingredients WHERE name = '油揚げ')),
  ('揚げ', (SELECT id FROM ingredients WHERE name = '油揚げ')),
  -- 厚揚げ
  ('あつあげ', (SELECT id FROM ingredients WHERE name = '厚揚げ')),
  ('生揚げ', (SELECT id FROM ingredients WHERE name = '厚揚げ'))
ON CONFLICT (alias) DO NOTHING;

-- 穀物・麺類
INSERT INTO ingredient_aliases (alias, ingredient_id) VALUES
  -- ごはん
  ('ご飯', (SELECT id FROM ingredients WHERE name = 'ごはん')),
  ('米', (SELECT id FROM ingredients WHERE name = 'ごはん')),
  ('白米', (SELECT id FROM ingredients WHERE name = 'ごはん')),
  ('ライス', (SELECT id FROM ingredients WHERE name = 'ごはん')),
  -- 餅
  ('もち', (SELECT id FROM ingredients WHERE name = '餅')),
  ('モチ', (SELECT id FROM ingredients WHERE name = '餅')),
  ('お餅', (SELECT id FROM ingredients WHERE name = '餅')),
  -- パスタ
  ('スパゲティ', (SELECT id FROM ingredients WHERE name = 'パスタ')),
  ('スパゲッティ', (SELECT id FROM ingredients WHERE name = 'パスタ'))
ON CONFLICT (alias) DO NOTHING;

-- その他
INSERT INTO ingredient_aliases (alias, ingredient_id) VALUES
  -- こんにゃく
  ('蒟蒻', (SELECT id FROM ingredients WHERE name = 'こんにゃく')),
  ('コンニャク', (SELECT id FROM ingredients WHERE name = 'こんにゃく')),
  -- わかめ
  ('ワカメ', (SELECT id FROM ingredients WHERE name = 'わかめ')),
  ('若布', (SELECT id FROM ingredients WHERE name = 'わかめ')),
  -- ひじき
  ('ヒジキ', (SELECT id FROM ingredients WHERE name = 'ひじき')),
  -- 昆布
  ('こんぶ', (SELECT id FROM ingredients WHERE name = '昆布')),
  ('コンブ', (SELECT id FROM ingredients WHERE name = '昆布'))
ON CONFLICT (alias) DO NOTHING;
