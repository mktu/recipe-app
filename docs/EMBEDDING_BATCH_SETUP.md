# 埋め込みバッチ処理のセットアップ

レシピ登録時は `title_embedding = NULL` で保存され、pg_cron + Edge Function で定期的に埋め込みを生成する。

## 前提条件

- Supabase プロジェクトが作成済み
- GitHub Actions の Secrets が設定済み（`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`）

## セットアップ手順

### 1. Edge Function のデプロイ

`main` ブランチへの push 時に GitHub Actions で自動デプロイされる。

手動デプロイする場合:
```bash
supabase link --project-ref <PROJECT_REF>
supabase functions deploy generate-embeddings
```

### 2. Edge Function の Secrets 設定

Supabase ダッシュボード → Edge Functions → `generate-embeddings` → Secrets

| Key | Value |
|-----|-------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API キー |

> `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` は自動設定される

### 3. JWT 検証の無効化

Supabase ダッシュボード → Edge Functions → `generate-embeddings` → Details

- **Verify JWT with legacy secret** を **OFF** にする
- 「Save changes」をクリック

> ⚠️ `config.toml` での設定は CLI の既知問題で反映されないため、ダッシュボードから手動で設定する

### 4. pg_cron 拡張の有効化

Supabase ダッシュボード → Database → Extensions

- `pg_cron` を有効化（schema: `pg_catalog` を推奨）

### 5. pg_net 拡張の有効化

SQL Editor で実行:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

確認:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

### 6. Cron ジョブの作成

Supabase ダッシュボード → Database → Cron Jobs → Create a new cron job

**埋め込み生成ジョブ:**

| 項目 | 値 |
|------|-----|
| Name | `generate-embeddings` |
| Schedule | `*/5 * * * *` (5分毎) |
| Type | Supabase Edge Function |
| Edge Function | `generate-embeddings` |
| HTTP Method | POST |
| HTTP Headers | (空) |
| HTTP Body | (空) |
| Timeout | `5000` |

**ログクリーンアップジョブ（任意）:**

| 項目 | 値 |
|------|-----|
| Name | `cleanup-old-cron-logs` |
| Schedule | `0 3 * * *` (毎日午前3時) |
| Type | SQL Snippet |
| SQL | `DELETE FROM cron.job_run_details WHERE end_time < NOW() - INTERVAL '7 days';` |

## 動作確認

### Cron 実行履歴の確認

```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC LIMIT 10;
```

### HTTP レスポンスの確認

```sql
SELECT id, status_code, content, created
FROM net._http_response
ORDER BY created DESC LIMIT 10;
```

期待する結果:
- `status_code`: `200`
- `content`: `{"message":"Embedding generation completed",...}`

### レシピの埋め込み状態確認

```sql
SELECT id, title,
       title_embedding IS NOT NULL AS has_embedding,
       embedding_retry_count
FROM recipes
ORDER BY created_at DESC LIMIT 10;
```

## トラブルシューティング

### 401 Missing authorization header

Edge Function の JWT 検証が有効になっている。
→ ダッシュボードで「Verify JWT」を OFF にする

### Missing GOOGLE_GENERATIVE_AI_API_KEY

Edge Function の Secrets が設定されていない。
→ ダッシュボードで API キーを設定する

### cron.job_run_details が空

pg_cron が有効化されていない、またはジョブが作成されていない。
→ 拡張とジョブの設定を確認する

### net._http_response が空

pg_net が有効化されていない。
→ `CREATE EXTENSION pg_net` を実行する

## リトライ制限

埋め込み生成に失敗したレシピは `embedding_retry_count` がインクリメントされる。
3回失敗すると処理対象から除外される。

リセットする場合:
```sql
UPDATE recipes SET embedding_retry_count = 0 WHERE id = '<recipe_id>';
```
