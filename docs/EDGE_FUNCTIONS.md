# Edge Functions 開発ガイド

Supabase Edge Functions の開発・デプロイに関するガイド。

## アーキテクチャ

```
src/lib/batch/           # ソースコード（Node.js）
├── alias-generator.ts
├── alias-db.ts
└── alias-llm.ts
        ↓  npm run functions:build
supabase/functions/auto-alias/
├── index.ts             # エントリーポイント（手動管理）
├── alias-generator.ts   # 自動生成（.gitignore）
├── alias-db.ts          # 自動生成（.gitignore）
└── alias-llm.ts         # 自動生成（.gitignore）
```

### なぜこの構成か

- **コード共有**: ローカルスクリプト（Node.js）とEdge Function（Deno）で同じロジックを使用
- **ビルド時変換**: `@supabase/supabase-js` → `npm:@supabase/supabase-js@2` などDeno向けに変換
- **CI検証**: PR時にビルドが通るか検証、マージ時にデプロイ

## ローカル開発

### 1. 共有ロジックをビルド

```bash
npm run functions:build
```

これにより `src/lib/batch/*.ts` が `supabase/functions/auto-alias/` にコピー・変換される。

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

## pg_cron との連携

Edge Function を定期実行する場合、pg_cron を使用:

```sql
-- 毎日 AM 3:00 (JST) に実行
SELECT cron.schedule(
  'auto-alias-daily',
  '0 18 * * *',  -- UTC 18:00 = JST 03:00
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/auto-alias',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

**注意:**
- pg_cron のタイムアウトは最大5秒
- 長時間処理は非同期パターン（202 Accepted を即座に返す）で対応
- auto-alias は非同期パターンを採用済み

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
