-- レシピノート（自作・AI 相談レシピ）の本文テーブルと、図鑑のレシピ行を対で作る RPC
-- Epic #172 / Issue #173
--
-- 設計方針:
--   - recipes のスキーマは変更しない。レシピ本文は recipe_notes に持ち、
--     recipes.url には相対パス '/notes/<note_id>' を入れてリンク先が自分自身になるようにする。
--     これで詳細画面の外部リンク・閲覧記録のリダイレクト・LINE Flex の uri が無改修で動く
--   - 「このレシピはノートか」の判定は URL を見ず recipe_notes.recipe_id の FK で行う
--   - ノート行・レシピ行・recipe_ingredients・unmatched_ingredients の書き込みは、
--     PostgREST が1リクエスト1トランザクションのため supabase-js を複数回呼ぶ形では原子性を張れない。
--     単一の Postgres 関数にまとめて RPC で1回呼ぶ
--
-- 既存 RPC との流儀の違い（いずれも意図的）:
--   既存の RPC 5本はすべて読み取り専用のため LANGUAGE sql / STABLE / SECURITY DEFINER で揃っているが、
--   本ファイルの2本は書き込み関数なので下記のとおり外している。
--   - LANGUAGE plpgsql      : note_id を先に採番して複数の INSERT で使い回すため手続きが要る
--   - VOLATILE（既定）       : 書き込むため。STABLE は誤り
--   - SECURITY INVOKER（既定）: サーバーは service_role で接続し RLS をバイパスするため DEFINER は何も足さない
--   - 権限は service_role のみ: 書き込み RPC をブラウザに露出する鍵から叩ける状態にしない。
--     Supabase は public スキーマの関数に anon / authenticated への EXECUTE をデフォルト権限で
--     付与するため、PUBLIC だけでなく両ロールからも明示的に REVOKE してから GRANT する

-- ===========================================
-- 1. recipe_notes テーブル
-- ===========================================
CREATE TABLE recipe_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID UNIQUE REFERENCES recipes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{name, amount}]
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,         -- ["...", "..."]
  image_key TEXT,
  servings TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザーのノート一覧用
CREATE INDEX idx_recipe_notes_user ON recipe_notes(user_id);
-- recipe_id は UNIQUE 制約が索引を兼ねるため別途作らない

-- updated_at 自動更新（init.sql の共通トリガ関数を再利用）
CREATE TRIGGER recipe_notes_updated_at
  BEFORE UPDATE ON recipe_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE recipe_notes IS 'ユーザーが自分で書いた／AI と相談して作ったレシピの本文。図鑑（recipes）とは recipe_id で1対1に対応する';
COMMENT ON COLUMN recipe_notes.recipe_id IS '対になる図鑑のレシピ行。nullable なのは将来のアレンジを図鑑に出すかどうかを後から選べるようにするため（Epic #172）。UNIQUE は NULL を複数許すので nullable のまま1対1を保証できる';
COMMENT ON COLUMN recipe_notes.ingredients IS '材料 [{name, amount}]。スクレイピング経路と違い amount を正しく持つ';
COMMENT ON COLUMN recipe_notes.steps IS '調理手順の配列。React のテキストとして描画するためサニタイズ不要';
COMMENT ON COLUMN recipe_notes.image_key IS 'プレースホルダー画像の識別子。アセットの実体と URL 組み立ては Issue #174';
COMMENT ON COLUMN recipe_notes.servings IS '「2人分」など。任意';

-- ===========================================
-- 2. RLS（サーバーサイドのみアクセス）
-- ===========================================
-- 本アプリは LINE 認証で Supabase Auth ユーザーを持たないため auth.uid() ベースは使わず、
-- ロール（service_role）ベースで書く（Issue #110、20260702000000_clarify_rls_policies.sql）
ALTER TABLE recipe_notes ENABLE ROW LEVEL SECURITY;

-- サービスロールのみ全操作可能
CREATE POLICY "Service role full access to recipe_notes"
ON recipe_notes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ===========================================
-- 3. ノート行とレシピ行を対で作る RPC
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
    user_id, title, url, source_name,
    ingredients_raw, memo, cooking_time_minutes, ingredients_linked
  ) VALUES (
    p_user_id,
    p_title,
    '/notes/' || v_note_id,
    'マイレシピ',
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

REVOKE EXECUTE ON FUNCTION create_recipe_note(UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_recipe_note(UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION create_recipe_note(UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) IS 'ノート行とレシピ行を対で作る。単一トランザクションなので途中で失敗すれば片方だけ残ることはない';

-- ===========================================
-- 4. ノートを更新して図鑑側へ書き戻す RPC
-- ===========================================
-- **全項目の置き換え（PUT セマンティクス）**であり、部分更新ではない。
-- p_image_key / p_servings / p_memo / p_cooking_time_minutes は DEFAULT NULL なので、
-- 渡さなければ NULL で上書きされる。COALESCE で「未指定なら現状維持」にはしていない。
-- 編集画面では値を空にする操作（分量やメモを消す）が正当なので、
-- 「未指定」と「明示的に空」を DB 側で区別しない代わりに、呼び出し側の型
-- （UpdateRecipeNoteInput）でこれらを必須にして渡し忘れを防いでいる。
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

COMMENT ON FUNCTION update_recipe_note(UUID, UUID, TEXT, JSONB, JSONB, UUID[], JSONB, TEXT, TEXT, TEXT, INTEGER) IS 'ノートを更新し、図鑑のレシピ行へ title / ingredients_raw / cooking_time_minutes を書き戻して食材を貼り直す。タイトル変更時は title_embedding を NULL に落として再生成させる';
