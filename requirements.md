# プロジェクト要求仕様書: RecipeHub (MVP)

## 1. プロジェクト概要

- **プロダクト名:** RecipeHub (レシピハブ)
- **ビジョン:** 「献立の意思決定コストをゼロにする」
- **コンセプト:** 複数のレシピサイトや SNS に散らばったお気に入りレシピを URL 一つで集約し、冷蔵庫の余り物から「自分が認めたレシピ」を爆速で検索できる自分専用のレシピ図鑑。

---

## 2. 主要ユースケース

### ユースケース 1：【収集】SNS やブラウザで「お！」と思った瞬間

- **シーン:** Instagram や YouTube で美味しそうな料理を見つけた。
- **行動:** 共有ボタンから LINE（または LIFF アプリ）を開き、URL を送信。
- **体験:** AI が自動で「なす」「鶏肉」などのメイン食材をタグ付けして保存完了。「後で見る」が確実にストックされる。

### ユースケース 2：【意思決定】スーパーや冷蔵庫の前で「何作ろう？」な瞬間

- **シーン:** 仕事帰りにスーパーに寄ったが、特売の「なす」を見て何を作るか迷う。
- **行動:** アプリを開き、食材タグの「なす」をタップ。
- **体験:** 過去に自分が「美味しそう」と思って保存したレシピの中から、なすを使うものだけが即座に一覧表示される。ハズレがないので迷わず決まる。

### ユースケース 3：【決定】レシピを選んで調理開始

- **シーン:** 検索結果から今日作るレシピを決める。
- **行動:** 一覧で材料リストをサッと確認し、レシピを選択。元サイトへ移動して調理開始。
- **体験:** 材料リストを見て「これなら家にある」と判断でき、迷わずレシピを決定できる。調理自体は元サイトを見ながら行う。

---

## 3. 機能要件 (MVP)

### 3.1 レシピ登録機能

- **URL インポート:** Web サイトの URL を入力すると、LLM が内容を解析。
- **自動パース (AI 解析):**
  - レシピ名、元サイト名、メイン食材（5 つ以内）、料理ジャンルを自動抽出。
  - 材料リスト（材料名＋分量）を抽出して保存。
  - 食材の「表記ゆれ」を補正（例：ナス、茄子 → なす）。
- **動画系コンテンツ（YouTube, Instagram 等）:** MVP では未対応。対応時はタイトルのみ自動取得＋手動タグ付けとする。
- **手動編集:** AI が抽出したタグの修正や、メモの追記。
- **重複登録防止:** 同一ユーザーが同じ URL を再登録しようとした場合はエラーとする。

### 3.2 検索・一覧機能

- **食材タグ検索:** 登録された食材タグによるフィルタリング。
  - 複数食材の AND 検索に対応（例：「なす」AND「鶏肉」で両方使うレシピを絞り込み）。
- **全文検索:** レシピ名やメモからのキーワード検索。
- **ソート:** 登録順、閲覧順など。

### 3.3 レシピ管理機能

- **編集:** 登録済みレシピのタグ・メモ等を UI 上で編集可能。
- **削除:** 不要になったレシピを UI 上で削除可能。
- **閲覧記録:** レシピを閲覧した回数・最終閲覧日時を自動記録（将来のレコメンド機能の基盤）。

### 3.4 ユーザー管理

- **LINE ログイン:** LINE アカウントによる簡単認証。
- **個人 DB:** ユーザーごとに保存したレシピが管理される。

---

## 4. 技術スタック

- **Frontend:** Next.js (App Router), TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Backend/DB:** Supabase (Auth, PostgreSQL)
- **LLM API:** Gemini 1.5 Flash (無料枠活用)
- **LLM 抽象化:** Vercel AI SDK (将来的なプロバイダー切り替えに対応)
- **Scraper:** Jina Reader API (`https://r.jina.ai/{URL}`) ※LLM への入力用
- **Platform:** LINE LIFF (LINE 内アプリ)

---

## 5. LLM 解析ロジック（詳細）

Gemini API (Vercel AI SDK 経由) に以下の役割を担わせる：

1. **入力:** Jina Reader 等で取得したレシピページのテキストデータ。
2. **処理:**

- 膨大なテキストから「材料」セクションを特定。
- 調味料（塩、醤油等）を除外し、メインの食材のみを抽出。
- 「中華」「時短」などの属性を付与。

3. **出力:** 構造化された JSON データ。

---

## 6. データベース設計

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
- `created_at`: Timestamp
- `updated_at`: Timestamp

### `ingredients` テーブル（食材マスター）

- `id`: UUID (Primary Key)
- `name`: String (Unique) -- "なす"
- `category`: String -- "野菜", "肉", "魚介" 等
- `needs_review`: Boolean (デフォルト false、AI が自動追加した場合は true)
- `created_at`: Timestamp

### `ingredient_aliases` テーブル（同義語辞書）

- `alias`: String (Primary Key) -- "茄子", "ナス"
- `ingredient_id`: UUID (Foreign Key → ingredients.id)

### `recipe_ingredients` テーブル（中間テーブル）

- `recipe_id`: UUID (Foreign Key → recipes.id)
- `ingredient_id`: UUID (Foreign Key → ingredients.id)
- `is_main`: Boolean (メイン食材かどうか、デフォルト false)
- PRIMARY KEY (`recipe_id`, `ingredient_id`)

#### ER図（概要）

```
users ─────< recipes >───── recipe_ingredients >───── ingredients
                                                           │
                                              ingredient_aliases
```

#### 食材の正規化フロー

1. AI がレシピから食材を抽出（例：「茄子」）
2. `ingredient_aliases` で検索 → 「なす」の ID を取得
3. なければ `ingredients` で完全一致検索
4. それでもなければ新規作成（要レビューフラグ付き）
5. `recipe_ingredients` に紐づけを保存

### シードデータ

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

---

## 7. 実装の境界線とフェーズ分割

### フェーズ 1：Web/LIFF 基盤と DB 連携（最優先）

- Supabase と Next.js の連携。
- 手動でのレシピ登録と一覧表示。
- 食材タグによる検索機能の実装。

### フェーズ 2：AI パースの実装

- Jina Reader + Claude API による自動抽出機能。
- URL 入力のみで保存が完了する体験の構築。

### フェーズ 3：LINE Messaging API 連携

- LINE トーク画面から URL を送ると自動で保存される機能。

---

## 8. 非機能要件

- **レスポンス:** 食材検索は 1 秒以内に完了すること。
- **モバイル UI:** 片手で操作できるボタン配置（親指が届く範囲に検索・登録ボタン）。
- **コスト抑制:** 無料枠（Supabase, Vercel）を最大限活用し、API コストは最小限のトークン消費に抑える。

---

## 9. 開発環境・テスト方針

### 認証の抽象化

LIFF 環境に依存せず開発できるよう、認証レイヤーを抽象化する。

```
認証プロバイダー（抽象化）
├── LIFFAuthProvider   ← 本番用（LINE ログイン）
└── DevAuthProvider    ← 開発用（モック認証）
```

- 環境変数 `NODE_ENV` で切り替え
- 開発時は固定のダミーユーザーでログイン済み扱い

### 開発フロー

| フェーズ | 認証 | 確認方法 |
|----------|------|----------|
| 機能開発 | DevAuth（モック） | `localhost:3000` でブラウザ確認 |
| LIFF 統合テスト | LIFF | ngrok + LINE アプリで実機確認 |
| 本番 | LIFF | Vercel + LINE LIFF |

### LIFF 実機確認が必要な場面

以下の LIFF 固有機能をテストする時のみ実機確認を行う：

- `liff.shareTargetPicker()`（LINE 共有）
- `liff.sendMessages()`（トークに送信）
- LINE ログインの UI/UX 確認

### ngrok によるローカル公開

```bash
npx ngrok http 3000
# 出力された https://xxxx.ngrok.io を LIFF Endpoint URL に設定
```

---

## 10. 将来の拡張方針（MVP 以降）

以下は MVP には含めないが、将来的に対応を検討する機能：

- **レコメンド機能:** 閲覧記録（view_count, last_viewed_at）を活用し、「最近見ていないレシピ」「よく見るレシピ」などをサジェスト。
- **動画系コンテンツ対応:** YouTube, Instagram 等の動画 URL からタイトル自動取得＋手動タグ付け。
- **旬の食材タグ / クイックアクセス:** 季節や特売品に応じた食材のショートカット。
