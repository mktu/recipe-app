# ローカル開発環境 (Supabase)

ローカル開発では Supabase CLI + Docker を使用し、リモート DB に接続せずに開発できる。

## セットアップ（初回のみ）

```bash
# Supabase CLI インストール (macOS)
brew install supabase/tap/supabase

# Docker が起動していることを確認
docker info
```

## 起動・停止

```bash
# ローカル Supabase 起動
supabase start

# 停止
supabase stop

# 状態確認
supabase status
```

## DB 操作

```bash
# マイグレーション + シード適用（DBリセット）
supabase db reset

# 新しいマイグレーション作成
supabase migration new <migration_name>

# ローカル DB に直接接続
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## 環境変数

| 環境 | ファイル | 用途 |
|------|----------|------|
| ローカル | `.env.local` | `http://127.0.0.1:54321` を指す |
| 本番 | `.env.production` | リモート Supabase を指す |

## Studio (管理画面)

ローカル起動後、http://127.0.0.1:54323 でアクセス可能。

## 本番マイグレーション

`supabase/migrations/` にファイルを追加して push すると、GitHub Actions が自動でマイグレーションを適用する。
- `develop` ブランチへの push → staging DB に適用
- `main` ブランチへの push → 本番 DB に適用

### 必要な GitHub Secrets

| Secret 名 | 取得方法 |
|-----------|----------|
| `SUPABASE_ACCESS_TOKEN` | [Supabase Dashboard](https://supabase.com/dashboard/account/tokens) → Access Tokens |
| `SUPABASE_PROJECT_REF` | Project Settings → General → Reference ID |

### 手動適用（緊急時）

GitHub Actions が設定されていない場合や緊急時は、Supabase Dashboard の **SQL Editor** で直接実行する。

## ローカル開発の注意点

### レシピ追加には `dev-user-001` の users 行が必要

`supabase/seed.sql` で投入される。無いとレシピ作成が失敗するので、
その場合は `npx supabase db reset` で seed を再投入する。

### レシピ取得には `supabase functions serve` が別途必要

解析・検索は Edge Function 経由なので、`npm run dev` だけでは動かない。
別ターミナルで起動しておくこと（詳細は `docs/EDGE_FUNCTIONS.md`）。

```bash
npm run functions:serve
```

E2E（`npm run test:e2e`）も同じ理由で必要。ホーム一覧の検証が `get-recipes` を通るため、
起動していないと `/api/recipes/list` が 503 になる。
CI ではクリーンな `supabase start` が Edge Runtime ごと立ち上げるのでこの手順は不要。

### worktree には `.env.local` が無い

`.env.local` は追跡対象外なので、worktree を作った先には存在しない。
`playwright.config.ts` はここから Supabase キーを読むため、worktree で E2E を回すなら
メインのチェックアウトからコピーしておくこと。

### worktree から `functions:serve` すると、worktree を消した後も壊れたまま残る

Edge Runtime コンテナ（`supabase_edge_runtime_recipe-app`）は**起動したディレクトリの
絶対パス**を握る。worktree で `npm run functions:serve` して、その worktree を消すと、
コンテナは生きたまま存在しないパスを参照し続ける。

```
worker boot error: failed to bootstrap runtime: failed to create the graph:
Module not found "file:///.../.claude/worktrees/<消えた worktree>/supabase/functions/get-recipes/index.ts"
```

**症状が原因から遠い。** `/api/recipes/list` がエラーを飲み込むため、ホーム画面は
ただの「レシピがまだ保存されていません」になり、DB にレシピがあっても空に見える。
E2E も詳細・削除だけでなく **`add-recipe.spec.ts` の既存テストまで**一斉に落ちるので、
自分の変更が壊したように見える。`docker logs supabase_edge_runtime_recipe-app` を見るまで分からない。

復旧はメインのチェックアウトから serve し直すだけ:

```bash
npm run functions:build   # 生成物は gitignore なので worktree 側には無い
npm run functions:serve
```

> **worktree で E2E を回したら、片付ける前にメインのチェックアウトから serve し直すこと。**

掴んでいるパスは Mounts から分かる:

```bash
docker inspect supabase_edge_runtime_recipe-app --format '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}'
```

踏まないようにする仕掛けは3段に入れてある（#39）。

| 仕掛け | 効くタイミング |
|---|---|
| `e2e/global-setup.ts` | E2E 実行前に `get-recipes` を probe し、原因を名指しして落とす |
| `/start-session` / `/end-session` | worktree の棚卸し時に掴んでいるパスを確認する |
| ホーム画面のエラー表示 | 取得失敗が EmptyState に化けないようにする（`RecipeListError`） |

### ローカルではアカウント削除ができない

`DevAuthProvider` の `getAccessToken` が `null` を返すため。
削除フローの確認は staging で行う。

### API は ID トークン検証必須

dev 環境は `NEXT_PUBLIC_LIFF_ID` を空にすることでバイパスされる。
クライアントからの API 呼び出しは `useAuthedFetch` を使うこと
（`src/lib/auth/verify-line-token.ts` / `src/lib/api/auth-guard.ts`）。

### Supabase キーの使い分け

| 用途 | キー |
|------|------|
| アプリ全体 | `SUPABASE_SECRET_KEY`（`sb_secret_...`） |
| Edge Functions 内部 | `SUPABASE_SERVICE_ROLE_KEY`（Supabase が自動インジェクト） |
