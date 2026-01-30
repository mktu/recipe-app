# データベース設計

## テーブル定義

### `users` テーブル

- `id`: UUID (Primary Key)
- `line_user_id`: String (Unique)
- `display_name`: String
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
- `ingredients_linked`: Boolean (食材マッチング完了フラグ、デフォルト false)
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

### `recipe_ingredients` テーブル（中間テーブル）

- `recipe_id`: UUID (Foreign Key → recipes.id)
- `ingredient_id`: UUID (Foreign Key → ingredients.id)
- `is_main`: Boolean (メイン食材かどうか、デフォルト false)
- PRIMARY KEY (`recipe_id`, `ingredient_id`)

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
