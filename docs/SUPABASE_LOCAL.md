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
