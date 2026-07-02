-- ============================================================================
-- RLS ポリシーの整理・明示化（defense-in-depth） / Issue #110
-- ============================================================================
--
-- 【背景】
-- 本アプリは LINE 認証を採用しており、Supabase Auth のユーザーは存在しない。
-- そのため init マイグレーション（20250116000000_init.sql）で定義した
-- `auth.uid()` ベースの RLS ポリシーは、リクエストのロールに関わらず
-- auth.uid() が常に NULL となり、誰にもマッチしない「空振り（dead code）」に
-- なっていた。per-user 認可をしているように見えて実際には何も認可しておらず、
-- 将来の読み手を誤解させるため、実アーキテクチャに沿ったポリシーへ置き換える。
--
-- 【実アーキテクチャ】
--   - ブラウザ/クライアント: publishable(anon) キーで Supabase に接続するが、
--     実際にアクセスするのは公開マスター（ingredients / ingredient_aliases）
--     の参照のみ。ユーザーデータ（users / recipes / recipe_ingredients）には
--     直接アクセスしない。
--   - サーバー（Next.js API Route / Edge Function）: service_role(secret) キー
--     で接続し、トークン検証済みの userId でアプリ層スコープを掛けた上で
--     ユーザーデータにアクセスする。service_role は RLS をバイパスする。
--
-- 【このマイグレーションの意図】
--   RLS は「アプリ層の userId スコープ書き忘れ」等の将来の実装ミスに対する
--   最後のバックストップ（多層防御）。ユーザーデータテーブルへは
--   service_role 以外（＝ブラウザに露出する anon キー）からのアクセスを
--   拒否することを明示する。service_role は RLS をバイパスするため、
--   実行時の挙動は現状（anon は 0 件 / service_role はフルアクセス）と変わらず、
--   本マイグレーションは「意図の明示」と「誤解を招く dead code の排除」が目的。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- users / recipes / recipe_ingredients: service_role のみアクセス可
--   anon / authenticated にはポリシーを一切付与しない（＝ RLS により既定で拒否）
-- ----------------------------------------------------------------------------

-- 空振りしていた auth.uid() ベースのポリシーを撤去
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;

DROP POLICY IF EXISTS "Users can view own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON recipes;

DROP POLICY IF EXISTS "Users can view own recipe_ingredients" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can insert own recipe_ingredients" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can delete own recipe_ingredients" ON recipe_ingredients;

-- service_role フルアクセス（unmatched_ingredients と同じ明示パターン）
CREATE POLICY "Service role full access to users"
  ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to recipes"
  ON recipes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to recipe_ingredients"
  ON recipe_ingredients FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- ingredients / ingredient_aliases: 公開マスター
--   参照(SELECT)は全ロール可（ブラウザの anon キーが読む）
--   追加・更新は service_role のみ（バッチ auto-alias 等）
-- ----------------------------------------------------------------------------

-- 既存の "Anyone can view ..." SELECT ポリシー（public / USING(true)）は維持し、
-- 書き込み用に service_role のフルアクセスを明示的に追加する。
CREATE POLICY "Service role full access to ingredients"
  ON ingredients FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to ingredient_aliases"
  ON ingredient_aliases FOR ALL TO service_role USING (true) WITH CHECK (true);
