# データベース設計

## テーブル定義

### `users` テーブル

- `id`: UUID (Primary Key)
- `line_user_id`: String (Unique)
- `display_name`: String
- `onboarding_completed_at`: Timestamp (NULL = 未完了、値あり = 完了済み)
- `created_at`: Timestamp

### `recipes` テーブル

- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key → users.id)
- `title`: String
- `url`: String (user_id + url で Unique)
- `source_name`: String (例: クックパッド)
- `ingredients_raw`: JSON (材料リスト。例: `[{"name": "なす", "amount": "2本"}, {"name": "鶏もも肉", "amount": "300g"}]`)
- `tags`: String[] (ジャンル等)
- `image_url`: String
- `memo`: String (ユーザーメモ)
- `view_count`: Integer (閲覧回数、デフォルト 0)
- `last_viewed_at`: Timestamp (最終閲覧日時)
- `cooking_time_minutes`: Integer (調理時間・分。不明の場合は NULL)
- `ingredients_linked`: Boolean (食材マッチング完了フラグ、デフォルト false)
- `title_embedding`: vector(3072) (タイトルの埋め込みベクトル。pgvector)
- `embedding_generated_at`: Timestamp (埋め込み生成日時)
- `embedding_retry_count`: Integer (埋め込み生成失敗回数。3回以上でスキップ、デフォルト 0)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### `ingredients` テーブル（食材マスター）

- `id`: UUID (Primary Key)
- `name`: String (Unique) -- "なす"
- `category`: String -- "野菜", "肉", "魚介" 等
- `needs_review`: Boolean (デフォルト false、AI が自動追加した場合は true)
- `parent_id`: UUID (Foreign Key → ingredients.id) -- 親食材（例: 豚バラ肉 → 豚肉）
- `created_at`: Timestamp

### `ingredient_aliases` テーブル（同義語辞書）

- `alias`: String (Primary Key) -- "茄子", "ナス"
- `ingredient_id`: UUID (Foreign Key → ingredients.id)
- `auto_generated`: Boolean (LLM による自動生成フラグ、デフォルト false)
- `created_at`: Timestamp

### `recipe_ingredients` テーブル（中間テーブル）

- `recipe_id`: UUID (Foreign Key → recipes.id)
- `ingredient_id`: UUID (Foreign Key → ingredients.id)
- `is_main`: Boolean (メイン食材かどうか、デフォルト false)
- PRIMARY KEY (`recipe_id`, `ingredient_id`)

### `unmatched_ingredients` テーブル（未マッチ食材キュー）

- `id`: UUID (Primary Key)
- `raw_name`: String (LLM が出力した生の食材名)
- `normalized_name`: String (正規化後の食材名)
- `recipe_id`: UUID (Foreign Key → recipes.id ON DELETE CASCADE)
- `created_at`: Timestamp

バッチ処理（`auto-alias` Edge Function）の処理待ちキュー。マッチング成功または新規食材追加後に削除される。

### `onboarding_sessions` テーブル（オンボーディング一時データ）

- `id`: UUID (Primary Key)
- `user_id`: String (users.line_user_id)
- `preferences`: JSONB (`{ searchQuery, dislikedIngredients, maxCookingMinutes }`)
- `candidates`: JSONB (スクレイピング結果。完了後に格納)
- `status`: String (`pending` / `completed` / `failed`)
- `created_at`: Timestamp
- `expires_at`: Timestamp (DEFAULT: 24時間後)

オンボーディング時の一時保存テーブル。完了（`POST /api/onboarding/complete`）後に削除される。

## ER図（概要）

```
users ─────< recipes >───── recipe_ingredients >───── ingredients
                                                           │
                                              ingredient_aliases
```

## 食材のマッチングフロー

```
入力: "豚肉細切れ 200g"
  ↓
正規化: "豚肉細切れ"（分量・単位を除去）
  ↓
マッチング（優先順）:
  1. エイリアス検索 → なければ次へ
  2. 完全一致検索 → なければ次へ
  3. 部分一致検索（マスター食材が入力に含まれるか、最長優先）
     例: "豚肉細切れ".includes("豚肉") → マッチ！
  4. マッチなし → 新規作成（needs_review=true）
  ↓
recipe_ingredients に紐づけを保存
```

## 正規化ロジックの設計方針

**基本方針: 精度（Precision）重視**

ルールベースの正規化では、複雑なパターンを追加するほど意図しない除去が発生するリスクが高まる。
そのため「確実にマッチするもの」だけを処理し、曖昧なケースはマッチさせない方針とする。

マッチしなかったものは将来的に LLM による解析フェーズに回すことで、段階的に精度を向上できる。

**正規化で除去するもの:**

| 対象 | 例 | 備考 |
|------|-----|------|
| ブランド名 | キッコーマン醤油 → 醤油 | 主要20ブランドをリスト管理 |
| 数字+単位（スペースなし） | 200g, 2本, 1/2個 | 確実なもののみ |
| 調理用語 | 少々, 適量, 大さじ, 小さじ | |
| 孤立した数字 | 醤油 1 → 醤油 | 調理用語除去後の残り |
| 括弧記号 | （皮なし）→ 皮なし | 中身は保持 |

**意図的に除去しないもの:**

| 対象 | 理由 |
|------|------|
| 玉, 株, 房 | 「玉ねぎ」「しめじ1株」など食材名の一部になりうる |
| スペースを挟んだ数字+単位 | 「1/2 玉ねぎ」の「玉」を誤除去しないため |

**参考: クックパッドの事例**

クックパッドでは Encoder-Decoder モデルによる材料名正規化を実装している。
- 正規表現のみ: 28.6% の正答率
- Encoder-Decoder: 71.2〜73.3% の正答率

ルールベースには限界があるため、本プロジェクトでは「精度重視のシンプルなルール + エイリアステーブル」で対応し、
必要に応じて LLM フォールバックを検討する。

## 検索時の親子展開

「豚肉」で検索すると、子食材（豚バラ肉、豚こま切れ肉等）を含むレシピもヒットする。

```
検索: "豚肉"
  ↓
展開: "豚肉" + 子食材（"豚バラ肉", "豚こま切れ肉", "豚ロース", "豚ひき肉"）
  ↓
結果: いずれかを含むレシピがヒット
```

## 親子関係の設定

| 親食材 | 子食材 |
|--------|--------|
| 鶏肉 | 鶏むね肉, 鶏もも肉, 鶏ささみ, 鶏手羽先, 鶏手羽元, 鶏ひき肉 |
| 豚肉 | 豚バラ肉, 豚ロース, 豚こま切れ肉, 豚ひき肉 |
| 牛肉 | 牛薄切り肉, 牛こま切れ肉, 牛ひき肉 |
| 豆腐 | 木綿豆腐, 絹ごし豆腐, 高野豆腐 |
| トマト | ミニトマト |

## シードデータ

食材マスターの初期データを `seed/ingredients.json` に用意済み。

**ファイル:** `seed/ingredients.json`

**件数:** 152件

**カテゴリ内訳:**

| カテゴリ | 件数 | 例 |
|----------|------|-----|
| 野菜 | 50件 | なす, きゅうり, トマト, にんじん |
| きのこ | 8件 | しいたけ, しめじ, えのき |
| 肉 | 20件 | 鶏肉, 鶏むね肉, 豚バラ肉, 牛肉 |
| 魚介 | 27件 | 鮭, さば, えび, いか, ツナ缶 |
| 卵・乳製品 | 7件 | たまご, 牛乳, バター, チーズ |
| 豆腐・大豆製品 | 11件 | 豆腐, 厚揚げ, 油揚げ, 納豆 |
| 穀物・麺類 | 10件 | ごはん, うどん, パスタ |
| その他 | 19件 | こんにゃく, わかめ, アボカド |

**データ形式:**
```json
[
  { "name": "なす", "category": "野菜" },
  { "name": "鶏肉", "category": "肉" },
  ...
]
```

**表記方針:**
- 一般名称（「鶏肉」）と詳細名称（「鶏むね肉」「鶏もも肉」）の両方を用意
- カタカナが一般的なもの（トマト, ブロッコリー）はカタカナ
- ひらがなが一般的なもの（なす, にんじん）はひらがな

**運用方針:**
- 初期データとして DB に投入
- AI が新規食材を出力した場合は自動追加（`needs_review` フラグ付き）
- 定期的にレビューして整理

## RPC 関数

PostgreSQL ストアドプロシージャ（Supabase RPC）として定義された関数。

| 関数名 | 説明 | 主な用途 |
|--------|------|---------|
| `get_frequent_ingredients(p_user_id, p_limit)` | ユーザーがよく使う食材を頻度順で取得 | レシピ一覧の食材フィルター候補表示 |
| `search_recipes_by_embedding(p_user_id, p_query_embedding, p_match_threshold, p_match_count)` | コサイン類似度によるベクトル検索 | セマンティック検索（pgvector `<=>` 演算子） |
| `get_unmatched_ingredient_counts(limit_count)` | 未マッチ食材を頻度順で集計 | `auto-alias` バッチの優先処理対象選定 |
| `get_recipes_few_ingredients(p_user_id, p_limit)` | 材料が少ないレシピ取得 | LINE Bot のカテゴリ検索 |
| `get_recipes_short_cooking_time(p_user_id, p_limit)` | 調理時間が短いレシピ取得 | LINE Bot のカテゴリ検索 |
