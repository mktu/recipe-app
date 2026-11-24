-- マイレシピの画像を登録時に AI で作る（#287）
--
-- 設計方針:
--   - AI 画像の公開 URL は recipe_notes.generated_image_url に持つ。recipes.image_url は
--     従来どおり RPC が書く表示用の写しで、プリセット（image_key）→ AI 画像 の順で組み立てる。
--     update_recipe_note は保存のたびに image_url を作り直すので、image_url に直接書くと次の編集で消える
--   - 列には Storage のパスではなく公開 URL（https://<project>.supabase.co/storage/v1/object/public/...）を持つ。
--     SQL は Supabase の URL を知らないので、パスでは image_url を組み立てられない。
--     preview は staging の Supabase を共有するので、相対パスにしていた理由（ドメインの違い）はここでは当たらない
--   - 生成の対象は image_status で明示的に持つ。「NULL なら作る」にしない。
--     migration や手作業の SQL で列が NULL に戻った瞬間に全件の生成（課金）が走るため
--   - 生成の確保（claim）と月の上限は claim_note_image_generations にまとめる。
--     登録直後の呼び出しと cron が同じノートを同時に拾っても、確保できるのは片方だけ

-- ===========================================
-- 1. 画像を置くバケット（AI 画像専用）
-- ===========================================
-- 公開バケット: LINE の Flex は認証なしで取れる https の URL しか表示できない。
-- storage.objects に SELECT のポリシーを付けないこと。付けると誰でもファイルの一覧を取れるようになり、
-- 「URL を知らなければ見られない」という利用規約 第5条の前提が崩れる。
-- 写真（#223）は公開範囲を別に選べるよう、このバケットに載せない
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('generated-images', 'generated-images', true, 5242880, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- 2. recipe_notes の列
-- ===========================================
-- 既存の行は DEFAULT で 'none'（生成の対象外）になる
ALTER TABLE recipe_notes
  ADD COLUMN generated_image_url TEXT,
  ADD COLUMN image_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN image_retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN image_generation_started_at TIMESTAMPTZ;

ALTER TABLE recipe_notes
  ADD CONSTRAINT recipe_notes_image_status_check
  CHECK (image_status IN ('none', 'pending', 'generating', 'ready', 'failed'));

-- cron の onlyIf と claim が毎回引くので、対象の行だけの部分インデックスにする
CREATE INDEX idx_recipe_notes_image_pending
  ON recipe_notes (created_at)
  WHERE image_status IN ('pending', 'generating');

COMMENT ON COLUMN recipe_notes.generated_image_url IS 'AI で作った画像の公開 URL（Storage の generated-images）。表示用の写しは RPC が recipes.image_url に書く';
COMMENT ON COLUMN recipe_notes.image_status IS 'none: 対象外 / pending: 作る対象 / generating: 生成中 / ready: 作り終えた / failed: 諦めた';
COMMENT ON COLUMN recipe_notes.image_retry_count IS '画像の生成を試みた回数（確保した時点で数える）';
COMMENT ON COLUMN recipe_notes.image_generation_started_at IS '生成を確保した時刻。生成中のまま古くなった行は cron が拾い直す';

-- ===========================================
-- 3. 生成の記録（月の上限を数える）
-- ===========================================
-- ノートの列で数えると、作り直し（#293）で上書きされて少なく数える。
-- Gemini を呼ぶたびに 1 行入れ、費用と一致させる。ノートを消しても数は残す（消して作り直す抜け道を作らない）
CREATE TABLE image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_note_id UUID REFERENCES recipe_notes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_image_generations_user_created ON image_generations (user_id, created_at);

ALTER TABLE image_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to image_generations"
ON image_generations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE image_generations IS 'マイレシピの画像生成（Gemini の呼び出し）の記録。1 ユーザーあたりの月の上限を数える';

-- ===========================================
-- 4. image_url の組み立て規則
-- ===========================================
CREATE OR REPLACE FUNCTION note_image_url(p_image_key TEXT, p_generated_image_url TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(note_placeholder_image_url(p_image_key), p_generated_image_url)
$$;

REVOKE EXECUTE ON FUNCTION note_image_url(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION note_image_url(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION note_image_url(TEXT, TEXT) IS 'recipes.image_url に入れる値。プリセット → AI 画像 の順。どちらも無ければ NULL（表示側が表紙を出す）';

-- ===========================================
-- 5. create_recipe_note（AI 画像を作る対象にする）
-- ===========================================
-- シグネチャは変えない。プリセットが指定されたときは作らない
CREATE OR REPLACE FUNCTION create_recipe_note(
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
RETURNS TABLE (note_id UUID, recipe_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
  v_note_id UUID := gen_random_uuid();
  v_recipe_id UUID;
BEGIN
  INSERT INTO recipes (
    user_id, title, url, source_name, image_url,
    ingredients_raw, memo, cooking_time_minutes, ingredients_linked
  ) VALUES (
    p_user_id,
    p_title,
    '/notes/' || v_note_id,
    'マイレシピ',
    note_image_url(p_image_key, NULL),
    COALESCE(p_ingredients, '[]'::jsonb),
    p_memo,
    p_cooking_time_minutes,
    COALESCE(array_length(p_ingredient_ids, 1), 0) > 0
  )
  RETURNING id INTO v_recipe_id;

  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, is_main)
  SELECT DISTINCT v_recipe_id, ing.id, TRUE
  FROM unnest(COALESCE(p_ingredient_ids, ARRAY[]::UUID[])) AS ing(id);

  INSERT INTO unmatched_ingredients (raw_name, normalized_name, recipe_id)
  SELECT u.raw_name, u.normalized_name, v_recipe_id
  FROM jsonb_to_recordset(COALESCE(p_unmatched, '[]'::jsonb))
    AS u(raw_name TEXT, normalized_name TEXT);

  INSERT INTO recipe_notes (
    id, user_id, recipe_id, title, ingredients, steps, image_key, servings, image_status
  ) VALUES (
    v_note_id,
    p_user_id,
    v_recipe_id,
    p_title,
    COALESCE(p_ingredients, '[]'::jsonb),
    COALESCE(p_steps, '[]'::jsonb),
    p_image_key,
    p_servings,
    CASE WHEN p_image_key IS NULL THEN 'pending' ELSE 'none' END
  );

  RETURN QUERY SELECT v_note_id, v_recipe_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_recipe_note(UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_recipe_note(UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION create_recipe_note(UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) IS 'ノート行とレシピ行を対で作る。単一トランザクション。プリセットが無ければ image_status を pending にして AI 画像の生成対象にする';

-- ===========================================
-- 6. update_recipe_note（AI 画像を残す）
-- ===========================================
-- 本体は 20260923000000_set_note_image_url.sql と同じで、image_url の組み立てだけ変える。
-- タイトルが変わっても画像は作り直さない（大量発火を避けるため。作り直しは #293 の明示的なボタンで行う）
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
  v_generated_image_url TEXT;
BEGIN
  SELECT n.recipe_id, n.generated_image_url INTO v_recipe_id, v_generated_image_url
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

  IF v_recipe_id IS NULL THEN
    RETURN;
  END IF;

  -- SET 句の右辺の title は更新前の値を指す
  UPDATE recipes SET
    title = p_title,
    image_url = note_image_url(p_image_key, v_generated_image_url),
    ingredients_raw = COALESCE(p_ingredients, '[]'::jsonb),
    memo = p_memo,
    cooking_time_minutes = p_cooking_time_minutes,
    ingredients_linked = COALESCE(array_length(p_ingredient_ids, 1), 0) > 0,
    title_embedding = CASE WHEN title IS DISTINCT FROM p_title THEN NULL ELSE title_embedding END,
    embedding_generated_at = CASE WHEN title IS DISTINCT FROM p_title THEN NULL ELSE embedding_generated_at END,
    embedding_retry_count = CASE WHEN title IS DISTINCT FROM p_title THEN 0 ELSE embedding_retry_count END
  WHERE id = v_recipe_id;

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

COMMENT ON FUNCTION update_recipe_note(UUID, UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) IS 'ノートを更新し、図鑑のレシピ行へ書き戻して食材を貼り直す。image_url はプリセット → AI 画像 の順で組み立てる。タイトル変更時は title_embedding を NULL に落とす（画像は作り直さない）';

-- ===========================================
-- 7. 生成の確保（claim）
-- ===========================================
-- 確保した行は generating にし、試行回数を数え、生成の記録を 1 行入れてから返す。
-- 月の上限を超えたユーザーの行は none に戻して返さない（表紙のまま）。
-- 定数の既定値は generate-note-images と cron の onlyIf（scripts/setup-cron.ts）と揃えること
CREATE OR REPLACE FUNCTION claim_note_image_generations(
  p_note_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 5,
  p_monthly_limit INTEGER DEFAULT 30,
  p_max_attempts INTEGER DEFAULT 3
)
RETURNS TABLE (note_id UUID, user_id UUID, title TEXT, ingredients JSONB, attempt INTEGER)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  r RECORD;
  v_used INTEGER;
  v_stale CONSTANT INTERVAL := interval '10 minutes';
  v_month_start TIMESTAMPTZ := date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo';
BEGIN
  -- 最後の試行の途中で止まった行は、拾い直す回数が残っていないので諦める
  UPDATE recipe_notes n SET image_status = 'failed'
  WHERE n.image_status = 'generating'
    AND n.image_retry_count >= p_max_attempts
    AND n.image_generation_started_at < now() - v_stale;

  FOR r IN
    SELECT n.id, n.user_id, n.title, n.ingredients, n.image_retry_count
    FROM recipe_notes n
    WHERE (p_note_id IS NULL OR n.id = p_note_id)
      AND n.image_retry_count < p_max_attempts
      AND (
        n.image_status = 'pending'
        OR (n.image_status = 'generating' AND n.image_generation_started_at < now() - v_stale)
      )
    ORDER BY n.created_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT count(*) INTO v_used
    FROM image_generations g
    WHERE g.user_id = r.user_id AND g.created_at >= v_month_start;

    IF v_used >= p_monthly_limit THEN
      UPDATE recipe_notes SET image_status = 'none' WHERE id = r.id;
      CONTINUE;
    END IF;

    UPDATE recipe_notes SET
      image_status = 'generating',
      image_generation_started_at = now(),
      image_retry_count = image_retry_count + 1
    WHERE id = r.id;

    INSERT INTO image_generations (user_id, recipe_note_id) VALUES (r.user_id, r.id);

    note_id := r.id;
    user_id := r.user_id;
    title := r.title;
    ingredients := r.ingredients;
    attempt := r.image_retry_count + 1;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION claim_note_image_generations(UUID, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_note_image_generations(UUID, INTEGER, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION claim_note_image_generations(UUID, INTEGER, INTEGER, INTEGER) IS 'AI 画像を作るノートを確保する（SKIP LOCKED で二重に確保しない）。月の上限を超えたユーザーの行は none に戻す';

-- ===========================================
-- 8. 生成の完了
-- ===========================================
-- 差し替え前の AI 画像の URL を返す（呼び出し側が Storage から消す）。
-- 生成中にノートが消された・確保し直された場合は no_data_found で失敗するので、
-- 呼び出し側は上げたばかりのファイルを消す
CREATE OR REPLACE FUNCTION complete_note_image_generation(p_note_id UUID, p_image_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_previous TEXT;
  v_recipe_id UUID;
  v_image_key TEXT;
BEGIN
  SELECT n.generated_image_url, n.recipe_id, n.image_key INTO v_previous, v_recipe_id, v_image_key
  FROM recipe_notes n
  WHERE n.id = p_note_id AND n.image_status = 'generating'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recipe note is not generating an image: %', p_note_id
      USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE recipe_notes SET
    generated_image_url = p_image_url,
    image_status = 'ready',
    image_generation_started_at = NULL
  WHERE id = p_note_id;

  IF v_recipe_id IS NOT NULL THEN
    UPDATE recipes SET image_url = note_image_url(v_image_key, p_image_url) WHERE id = v_recipe_id;
  END IF;

  RETURN v_previous;
END;
$$;

REVOKE EXECUTE ON FUNCTION complete_note_image_generation(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_note_image_generation(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION complete_note_image_generation(UUID, TEXT) IS 'AI 画像の URL を保存して ready にし、recipes.image_url を組み立て直す。差し替え前の URL を返す';
