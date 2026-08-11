# Scripts

開発・テスト用スクリプト集

## レシピ登録テスト

### URL収集

```bash
npm run collect:urls
```

サイトマップから自動でレシピURLを収集し、`seed/test-recipe-urls.txt` に保存する。

**収集対象サイト:**
- Delish Kitchen (50件)
- クラシル (50件)
- みんなのきょうの料理 (15件)
- 味の素パーク (13件)
- 白ごはん.com (10件)

### レシピ登録テスト

```bash
# 全件実行
npm run test:recipe

# 件数制限
npm run test:recipe --limit=10

# パースのみ（登録しない）
npm run test:recipe --dry-run

# 単発実行
npm run test:recipe https://example.com/recipe/123

# リクエスト間隔を調整（ミリ秒）
npm run test:recipe --delay=2000
```

**前提条件:**
- 開発サーバーが起動していること (`npm run dev`)
- ローカル Supabase が起動していること (`supabase start`)

**出力例:**
```
🧪 レシピ登録一括テスト
========================
サーバー: http://localhost:3000
ユーザー: dev-user-001
対象件数: 10件

[1/10] https://delishkitchen.tv/recipes/xxx
   パース中...
   タイトル: サンプルレシピ
   食材数: 5件
   登録中...
   ✅ 登録完了 (ID: xxx)

========================================
📊 実行結果レポート
========================================
✅ 成功: 8件
⏭️  スキップ（登録済み）: 2件
❌ 失敗: 0件
合計: 10件
```

## Flex Message プレビュー

```bash
npm run preview:flex           # デフォルト (5件)
npm run preview:flex -- --count=3  # 件数指定 (1〜5)
```

出力された JSON を [LINE Flex Message Simulator](https://developers.line.biz/flex-simulator/) に貼り付けるとデプロイ前に見た目を確認できる。

**ダミーデータに含まれるエッジケース:**
- 画像なし（プレースホルダー表示の確認）
- ソース名なし（レイアウト崩れの確認）

## LINE Botレスポンステスト

```bash
# 食材検索プロンプト
npm run test:bot "食材"

# 通常検索
npm run test:bot "鶏肉 玉ねぎ"

# ヘルプ
npm run test:bot "使い方"
```

LINE Botのレスポンスをローカルで確認できる。ngrok不要。

**前提条件:**
- ローカル Supabase が起動していること (`supabase start`)

**出力例:**
```
🧪 LINE Bot Response Test
========================================
📤 Input: "食材"
👤 User: dev-user-001

🔀 Route: Ingredient Search Prompt

📥 Response:
   type: text
   text: 🔍 食材で検索
         ...

   quickReply:
     - [鶏肉] → "鶏肉"
     - [豚肉] → "豚肉"
     ...
```

## 埋め込み生成（ベクトル検索用）

レシピ登録時は `title_embedding = NULL` で保存され、バッチ処理で埋め込みを生成する。

### ローカルでの埋め込み生成

**方法1: バックフィルスクリプト（推奨）**

```bash
# レシピ登録 + 埋め込み生成をセットで実行
npm run test:recipe:with-embeddings -- --limit=5

# 埋め込みのみ生成（既存レシピ対象）
npm run backfill:embeddings
```

**方法2: Edge Function をローカル実行**

```bash
# 1. Edge Function サーバーを起動（別ターミナル）
npm run functions:serve

# 2. Edge Function を呼び出し
npm run functions:invoke
```

**出力例:**
```json
{"message":"Embedding generation completed","processed":3,"succeeded":3,"failed":0}
```

### ステージング/本番環境

```bash
# ステージング環境のバックフィル
npm run backfill:embeddings -- --env=staging
```

本番では pg_cron + Edge Function で5分毎に自動実行される。

### リトライ制限

- 埋め込み生成に失敗したレシピは `embedding_retry_count` がインクリメントされる
- 3回失敗すると処理対象から除外される
- リセット: `UPDATE recipes SET embedding_retry_count = 0 WHERE ...`

## 食材マッチング解析

```bash
./scripts/check-ingredient-match-rate.sh
```

DBに登録されたレシピの食材マッチング率と未マッチ食材TOP20を表示する。

## 自動追加食材の監査レポート

auto-alias が自動追加した食材（`auto_generated = TRUE`）を洗い出し、管理者向け LINE 通知の本文を組み立てる。
本番では `audit-auto-generated` Edge Function が毎週月曜 JST 09:00 に同じ処理を実行する（Issue #150）。

```bash
# 本文を標準出力するだけ（送信しない）
npm run audit:auto-generated

# 期間を広げる（ローカルは自動追加食材が少ないため）
npm run audit:auto-generated -- --days=3650

# 実際に管理者へ LINE 送信する（LINE_CHANNEL_ACCESS_TOKEN / LINE_ADMIN_USER_ID が必要）
npm run audit:auto-generated -- --push

# ステージング環境
npm run audit:auto-generated -- --env=staging
```

カテゴリ誤りを見つけたら SQL で直す（管理 UI は無い）:

```sql
UPDATE ingredients SET category='豆腐・大豆製品' WHERE name='厚揚げ';  -- カテゴリ修正
UPDATE ingredients SET needs_review=true WHERE name='ゴミ食材';        -- 誤登録を非表示に
```

## pg_cron ジョブのセットアップ

```bash
npx tsx scripts/setup-cron.ts --env=staging
npx tsx scripts/setup-cron.ts --env=production
```

**ジョブ定義の正本はこのスクリプト。** DB は変更せず、貼り付け用の冪等な SQL を出力するだけなので、
出力を Supabase ダッシュボードの SQL Editor で実行する。詳細は `docs/EDGE_FUNCTIONS.md` を参照。
