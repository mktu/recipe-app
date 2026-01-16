-- RecipeHub Database Schema
-- Supabase SQL Editor で実行してください

-- ===========================================
-- 1. users テーブル
-- ===========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 2. recipes テーブル
-- ===========================================
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source_name TEXT,
  ingredients_raw JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  memo TEXT,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 同一ユーザーの重複URL防止
  UNIQUE(user_id, url)
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- 3. ingredients テーブル（食材マスター）
-- ===========================================
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  needs_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 4. ingredient_aliases テーブル（同義語辞書）
-- ===========================================
CREATE TABLE ingredient_aliases (
  alias TEXT PRIMARY KEY,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE
);

-- ===========================================
-- 5. recipe_ingredients テーブル（中間テーブル）
-- ===========================================
CREATE TABLE recipe_ingredients (
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  is_main BOOLEAN DEFAULT FALSE,

  PRIMARY KEY (recipe_id, ingredient_id)
);

-- ===========================================
-- インデックス
-- ===========================================

-- レシピ検索用
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);

-- 食材検索用
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_name ON ingredients(name);

-- 中間テーブル検索用
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_recipe_ingredients_is_main ON recipe_ingredients(is_main) WHERE is_main = TRUE;

-- ===========================================
-- Row Level Security (RLS)
-- ===========================================

-- RLS を有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- users: 自分のデータのみ参照可能
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = line_user_id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = line_user_id);

-- recipes: 自分のレシピのみ操作可能
CREATE POLICY "Users can view own recipes" ON recipes
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
  );

CREATE POLICY "Users can insert own recipes" ON recipes
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
  );

CREATE POLICY "Users can update own recipes" ON recipes
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
  );

CREATE POLICY "Users can delete own recipes" ON recipes
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
  );

-- ingredients: 全員が参照可能、Service Role のみ追加・更新可能
CREATE POLICY "Anyone can view ingredients" ON ingredients
  FOR SELECT USING (true);

-- ingredient_aliases: 全員が参照可能
CREATE POLICY "Anyone can view aliases" ON ingredient_aliases
  FOR SELECT USING (true);

-- recipe_ingredients: レシピ所有者のみ操作可能
CREATE POLICY "Users can view own recipe_ingredients" ON recipe_ingredients
  FOR SELECT USING (
    recipe_id IN (
      SELECT r.id FROM recipes r
      JOIN users u ON r.user_id = u.id
      WHERE u.line_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own recipe_ingredients" ON recipe_ingredients
  FOR INSERT WITH CHECK (
    recipe_id IN (
      SELECT r.id FROM recipes r
      JOIN users u ON r.user_id = u.id
      WHERE u.line_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own recipe_ingredients" ON recipe_ingredients
  FOR DELETE USING (
    recipe_id IN (
      SELECT r.id FROM recipes r
      JOIN users u ON r.user_id = u.id
      WHERE u.line_user_id = auth.uid()::text
    )
  );
