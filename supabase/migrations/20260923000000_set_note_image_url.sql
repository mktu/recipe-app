-- ノートのプレースホルダー画像を図鑑側の recipes.image_url に書き込む
-- Epic #172 / Issue #174
--
-- 設計方針:
--   - ノート側の recipe_notes.image_key を正本とし、表示用のパスを recipes.image_url に入れる。
--     一覧（get-recipes Edge Function）・詳細・LINE Flex はどれも image_url だけを読むため、
--     書き込み時に解決しておけば図鑑側はノートの存在を知らないまま画像を出せる。
--     表示時に image_key から組み立てると3経路すべてに recipe_notes の join が要る
--   - image_url には相対パス '/placeholders/<key>.png' を入れる（recipes.url が相対なのと揃える）。
--     絶対 URL を焼くと staging / 本番 / preview でドメインが変わるため。
--     LINE Flex は絶対 URL 必須なので、アプリ側（src/lib/line/flex-image.ts）で合成する
--   - アセットを差し替え・リネームするときは、image_key から image_url を再生成する
--     migration を流せばよい（末尾の UPDATE と同じ形）
--
-- #173 の create_recipe_note / update_recipe_note は image_key を保存するだけで、
-- image_url は「アセットが無いので #174 へ」と先送りしていた。シグネチャは変えずに本体だけ差し替える。

-- ===========================================
-- 1. image_key の形式制約
-- ===========================================
-- key はそのままパスに埋め込まれるため、パス区切りや拡張子を含められないようにしておく。
-- 候補の一覧（src/lib/recipe/placeholder-images.ts）までは DB に持たない。
-- 候補の追加のたびに migration が要るようにはしたくないため
ALTER TABLE recipe_notes
  ADD CONSTRAINT recipe_notes_image_key_format CHECK (image_key ~ '^[a-z0-9-]+$');

-- ===========================================
-- 2. image_key → image_url の規則
-- ===========================================
-- 規則はアプリ側の placeholderImagePath() と二重に持っている。変えるときは両方直すこと。
-- NULL を渡すと NULL が返る（|| は NULL を伝播する）
CREATE OR REPLACE FUNCTION note_placeholder_image_url(p_image_key TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT '/placeholders/' || p_image_key || '.png'
$$;

REVOKE EXECUTE ON FUNCTION note_placeholder_image_url(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION note_placeholder_image_url(TEXT) TO service_role;

COMMENT ON FUNCTION note_placeholder_image_url(TEXT) IS 'ノートの image_key から recipes.image_url に入れる相対パスを組み立てる。規則は src/lib/recipe/placeholder-images.ts と揃えること';

-- ===========================================
-- 3. create_recipe_note（image_url を書くように差し替え）
-- ===========================================
CREATE OR REPLACE FUNCTION create_recipe_note(
  p_user_id UUID,
  p_title TEXT,
  p_ingredients JSONB,           -- [{name, amount}]
  p_steps JSONB,                 -- ["...", "..."]
  p_ingredient_ids UUID[],       -- アプリ側で解決済みの食材
  p_unmatched JSONB,             -- [{raw_name, normalized_name}]
  p_image_key TEXT DEFAULT NULL,
  p_servings TEXT DEFAULT NULL,
  p_memo TEXT DEFAULT NULL,
  p_cooking_time_minutes INTEGER DEFAULT NULL
)
RETURNS TABLE (note_id UUID, recipe_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
  v_note_id UUID := gen_random_uuid();
  v_recipe_id UUID;
BEGIN
  -- FK は note -> recipe の一方向しか無いので、参照される側（レシピ行）から先に入れる。
  -- ノート ID は行が存在する前に gen_random_uuid() で確定できるため URL を先に組み立てられ、
  -- recipe_id を NULL で置いてから UPDATE で埋め直す手間が要らない。
  INSERT INTO recipes (
    user_id, title, url, source_name, image_url,
    ingredients_raw, memo, cooking_time_minutes, ingredients_linked
  ) VALUES (
    p_user_id,
    p_title,
    '/notes/' || v_note_id,
    'マイレシピ',
    note_placeholder_image_url(p_image_key),
    COALESCE(p_ingredients, '[]'::jsonb),
    p_memo,
    p_cooking_time_minutes,
    COALESCE(array_length(p_ingredient_ids, 1), 0) > 0
  )
  RETURNING id INTO v_recipe_id;

  -- title_embedding は触らない。NULL のままにしておけば generate-embeddings が拾って埋める

  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, is_main)
  SELECT DISTINCT v_recipe_id, ing.id, TRUE
  FROM unnest(COALESCE(p_ingredient_ids, ARRAY[]::UUID[])) AS ing(id);

  -- 未マッチ食材もここで記録する。図鑑側の登録経路では解析時に recipe_id を持たないまま
  -- 記録されるが、ノート経路はレシピ行と同一トランザクションなので出典を残せる
  INSERT INTO unmatched_ingredients (raw_name, normalized_name, recipe_id)
  SELECT u.raw_name, u.normalized_name, v_recipe_id
  FROM jsonb_to_recordset(COALESCE(p_unmatched, '[]'::jsonb))
    AS u(raw_name TEXT, normalized_name TEXT);

  INSERT INTO recipe_notes (
    id, user_id, recipe_id, title, ingredients, steps, image_key, servings
  ) VALUES (
    v_note_id,
    p_user_id,
    v_recipe_id,
    p_title,
    COALESCE(p_ingredients, '[]'::jsonb),
    COALESCE(p_steps, '[]'::jsonb),
    p_image_key,
    p_servings
  );

  RETURN QUERY SELECT v_note_id, v_recipe_id;
END;
$$;

-- CREATE OR REPLACE は既存の権限を保持するが、#173 と同じく明示しておく
REVOKE EXECUTE ON FUNCTION create_recipe_note(UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_recipe_note(UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION create_recipe_note(UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) IS 'ノート行とレシピ行を対で作る。単一トランザクションなので途中で失敗すれば片方だけ残ることはない。image_key からレシピ行の image_url を組み立てる';

-- ===========================================
-- 4. update_recipe_note（image_url を書き戻すように差し替え）
-- ===========================================
-- **全項目の置き換え（PUT セマンティクス）**であり、部分更新ではない（#173 から変更なし）。
-- p_image_key を渡さなければ image_key も image_url も NULL に戻る。
CREATE OR REPLACE FUNCTION update_recipe_note(
  p_note_id UUID,
  p_user_id UUID,
  p_title TEXT,
  p_ingredients JSONB,
  p_steps JSONB,
  p_ingredient_ids UUID[],
  p_unmatched JSONB,
  p_image_key TEXT DEFAULT NULL,
  p_servings TEXT DEFAULT NULL,
  p_memo TEXT DEFAULT NULL,
  p_cooking_time_minutes INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_recipe_id UUID;
BEGIN
  -- 所有者チェックを兼ねて対のレシピ行を引く
  SELECT n.recipe_id INTO v_recipe_id
  FROM recipe_notes n
  WHERE n.id = p_note_id AND n.user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recipe note not found or not owned by user: %', p_note_id
      USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE recipe_notes SET
    title = p_title,
    ingredients = COALESCE(p_ingredients, '[]'::jsonb),
    steps = COALESCE(p_steps, '[]'::jsonb),
    image_key = p_image_key,
    servings = p_servings
  WHERE id = p_note_id;

  -- recipe_id が NULL のノート（将来のアレンジ用）は図鑑側の行を持たない。
  -- メモと調理時間は recipes 側にしか置き場が無いため、この経路では保存されない。
  -- 現状 create_recipe_note は必ずレシピ行を作るのでこの分岐には入らない。
  -- アレンジを図鑑に出さない選択肢を実装するとき（Epic #172）に、
  -- recipe_notes 側へ列を足すかどうかを併せて決めること。
  IF v_recipe_id IS NULL THEN
    RETURN;
  END IF;

  -- 図鑑側へ書き戻す。
  -- タイトルが変わったら埋め込みを無効化する。generate-embeddings は
  -- title_embedding IS NULL かつ embedding_retry_count < 上限 の行を拾うため、
  -- リトライ回数も戻さないと過去に失敗を重ねた行が再生成されない。
  -- SET 句の右辺の title は更新前の値を指す。
  UPDATE recipes SET
    title = p_title,
    image_url = note_placeholder_image_url(p_image_key),
    ingredients_raw = COALESCE(p_ingredients, '[]'::jsonb),
    memo = p_memo,
    cooking_time_minutes = p_cooking_time_minutes,
    ingredients_linked = COALESCE(array_length(p_ingredient_ids, 1), 0) > 0,
    title_embedding = CASE WHEN title IS DISTINCT FROM p_title THEN NULL ELSE title_embedding END,
    embedding_generated_at = CASE WHEN title IS DISTINCT FROM p_title THEN NULL ELSE embedding_generated_at END,
    embedding_retry_count = CASE WHEN title IS DISTINCT FROM p_title THEN 0 ELSE embedding_retry_count END
  WHERE id = v_recipe_id;

  -- 食材の貼り直し
  DELETE FROM recipe_ingredients WHERE recipe_id = v_recipe_id;

  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, is_main)
  SELECT DISTINCT v_recipe_id, ing.id, TRUE
  FROM unnest(COALESCE(p_ingredient_ids, ARRAY[]::UUID[])) AS ing(id);

  DELETE FROM unmatched_ingredients WHERE recipe_id = v_recipe_id;

  INSERT INTO unmatched_ingredients (raw_name, normalized_name, recipe_id)
  SELECT u.raw_name, u.normalized_name, v_recipe_id
  FROM jsonb_to_recordset(COALESCE(p_unmatched, '[]'::jsonb))
    AS u(raw_name TEXT, normalized_name TEXT);
END;
$$;

REVOKE EXECUTE ON FUNCTION update_recipe_note(UUID, UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION update_recipe_note(UUID, UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION update_recipe_note(UUID, UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) IS 'ノートを更新し、図鑑のレシピ行へ title / image_url / ingredients_raw / cooking_time_minutes を書き戻して食材を貼り直す。タイトル変更時は title_embedding を NULL に落として再生成させる';

-- ===========================================
-- 5. 既存ノートの image_url を埋める
-- ===========================================
-- ノートを作る UI はまだ無い（#175）ので本番に対象行は無い想定だが、
-- 開発・staging で RPC を直接叩いて作った行があれば揃えておく
UPDATE recipes r
SET image_url = note_placeholder_image_url(n.image_key)
FROM recipe_notes n
WHERE n.recipe_id = r.id
  AND n.image_key IS NOT NULL
  AND r.image_url IS DISTINCT FROM note_placeholder_image_url(n.image_key);

COMMENT ON COLUMN recipe_notes.image_key IS 'プレースホルダー画像の識別子（public/placeholders/<key>.png）。表示用のパスは RPC が recipes.image_url に書き込む';
