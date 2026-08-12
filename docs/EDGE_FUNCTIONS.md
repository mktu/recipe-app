# Edge Functions 開発ガイド

Supabase Edge Functions の開発・デプロイに関するガイド。

## アーキテクチャ

```
src/lib/batch/           # ソースコード（Node.js）
├── alias-generator.ts
├── alias-db.ts
├── alias-llm.ts
└── auto-generated-report.ts
        ↓  npm run functions:build
supabase/functions/auto-alias/
├── index.ts             # エントリーポイント（手動管理）
├── alias-generator.ts   # 自動生成（.gitignore）
├── alias-db.ts          # 自動生成（.gitignore）
└── alias-llm.ts         # 自動生成（.gitignore）

supabase/functions/audit-auto-generated/
├── index.ts                  # エントリーポイント（手動管理）
└── auto-generated-report.ts  # 自動生成（.gitignore）

src/lib/search/          # 検索ロジック（LINE Bot と共有）
├── normalize.ts
├── ingredient-index.ts
├── resolve-term.ts
├── parse-query.ts
└── filter-recipes.ts
        ↓  npm run functions:build
supabase/functions/get-recipes/
├── index.ts             # エントリーポイント（手動管理）
└── search/              # 自動生成（.gitignore）
```

> 共有元を増やしたら `.github/workflows/supabase-functions.yml` の `paths` にも追加すること
> （追加しないとソース変更時にデプロイが走らない）。

### なぜこの構成か

- **コード共有**: ローカルスクリプト（Node.js）とEdge Function（Deno）で同じロジックを使用
- **ビルド時変換**: `@supabase/supabase-js` → `npm:@supabase/supabase-js@2` などDeno向けに変換
- **CI検証**: PR時にビルドが通るか検証、マージ時にデプロイ

## ローカル開発

### 1. 共有ロジックをビルド

```bash
npm run functions:build
```

これにより `src/lib/batch/*.ts` → `supabase/functions/auto-alias/` /
`supabase/functions/audit-auto-generated/`、
`src/lib/search/*.ts` → `supabase/functions/get-recipes/search/` にコピー・変換される。

### 2. Edge Function を起動

```bash
npm run functions:serve
```

### 3. テスト実行

```bash
# Edge Function を直接呼び出し
curl -X POST http://localhost:54321/functions/v1/auto-alias \
  -H "Authorization: Bearer <anon-key>"

# または Node.js スクリプトでテスト（推奨）
npx tsx scripts/auto-alias.ts --dry-run --limit=5

# 監査通知の本文を確認（送信はしない。--push で実送信）
npm run audit:auto-generated -- --days=30
```

## CI/CD

### PR時（ci.yml）

```
npm run lint
    ↓
npm run functions:build  ← ビルド検証
    ↓
npm run build
```

### マージ後（supabase-functions.yml）

```
npm run functions:build
    ↓
supabase functions deploy
```

**トリガー条件:**
- `supabase/functions/**` の変更
- `src/lib/batch/**` の変更
- `scripts/build-edge-functions.ts` の変更

## 新しい Edge Function の追加

### 1. 関数ディレクトリ作成

```bash
mkdir -p supabase/functions/<function-name>
```

### 2. index.ts を作成

```typescript
// supabase/functions/<function-name>/index.ts
Deno.serve(async (req) => {
  // 処理
  return new Response(JSON.stringify({ ok: true }))
})
```

### 3. 共有ロジックがある場合

`scripts/build-edge-functions.ts` の `functions` 配列に追加:

```typescript
const functions: FunctionConfig[] = [
  {
    name: 'auto-alias',
    sharedFiles: [
      { src: 'src/lib/batch/alias-generator.ts', dest: 'alias-generator.ts' },
      // ...
    ],
  },
  // 新しい関数を追加
  {
    name: '<function-name>',
    sharedFiles: [
      { src: 'src/lib/xxx/yyy.ts', dest: 'yyy.ts' },
    ],
  },
]
```

## 環境変数

Edge Function で使用する環境変数は Supabase Dashboard で設定:

1. Project Settings → Edge Functions
2. 対象の関数を選択
3. 「Secrets」タブで環境変数を追加

**auto-alias で必要な環境変数:**
- `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini API キー

**audit-auto-generated で必要な環境変数:**
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE push 通知用（Messaging API チャネル）。**既に設定済み**
- `LINE_ADMIN_USER_ID` - 通知先。新規に設定が必要

> どちらか欠けていると 500 を返して何もしない（誤った宛先に送るより気付ける方を選ぶ）。
> staging / production の両方に設定が必要。

`LINE_ADMIN_USER_ID` の調べ方は、対象環境の SQL Editor で自分の行を引くのが確実:

```sql
SELECT line_user_id, display_name, created_at FROM users ORDER BY created_at;
```

LINE の user ID は**チャネル（プロバイダー）スコープ**で、staging と本番で Messaging API
チャネルが分かれている（`docs/LINE_SETUP.md`）ため、**環境ごとに別の ID になり得る**。
Webhook 経由で保存されたこの ID なら、送信元チャネルとの対応と友だち追加済みの両方が担保される。
LINE Developers console の「あなたのユーザーID」でも取れるが、上記2条件を自分で満たす必要がある。

> `LINE_CHANNEL_ACCESS_TOKEN` は削除済みの onboarding 機能の名残で既に入っている。
> その後 LINE console でトークンを再発行していると古い値のままなので、
> 有効性は初回の単発実行（下記 pg_cron の項）で確認する（無効なら `LINE push failed: 401`）。

## pg_cron との連携

**cron ジョブ定義の正本は `scripts/setup-cron.ts`。** ジョブを増やす・スケジュールを変えるときは
まずこのファイルを直す（ダッシュボードで直接いじると次の貼り直しで消える）。

```bash
# 貼り付け用の冪等な SQL を出力する（DB は変更しない）
npx tsx scripts/setup-cron.ts --env=staging
npx tsx scripts/setup-cron.ts --env=production
```

出力を Supabase ダッシュボードの SQL Editor で実行する。各ジョブは
`cron.unschedule` → `cron.schedule` の順で出力されるため、何度流しても同じ状態になる。

現在のジョブ（すべて UTC 指定）:

| ジョブ名 | schedule | 対象 |
|---------|----------|------|
| `generate-embeddings` | `*/5 * * * *` | `generate-embeddings` |
| `auto-alias-daily` | `0 18 * * *`（JST 03:00） | `auto-alias` |
| `audit-auto-generated-weekly` | `0 0 * * 1`（JST 月曜 09:00） | `audit-auto-generated` |
| `cleanup-cron-logs` | `0 0 * * *` | SQL 直実行（古い実行ログ削除） |

**注意:**
- **対象の Edge Function をデプロイした後**に SQL を流すこと
- 出力 SQL には secret key が平文で入り、`cron.job` テーブルにも残る。
  キーをローテーションしたらスクリプトを流し直して貼り替える
- pg_cron のタイムアウトは最大5秒
- 長時間処理は非同期パターン（202 Accepted を即座に返す）で対応。auto-alias は採用済み
- cron を待たずに確認したいときは、出力 SQL の `net.http_post(...)` 部分だけを単発で実行する

## トラブルシューティング

### ビルドエラー

```bash
# ビルドスクリプトを直接実行して詳細を確認
npx tsx scripts/build-edge-functions.ts
```

### デプロイ後に動作しない

1. Supabase Dashboard → Edge Functions → Logs でエラーを確認
2. 環境変数が設定されているか確認
3. JWT 検証設定を確認（pg_cron からの呼び出しは OFF にする）
