# 本番公開準備

## ステータス
✅ Critical 対応完了・本番稼働中

## 背景・課題

一般公開に向けて、以下の対応が必要：

- LINE LIFF・Messaging API の本番設定が未完了
- Supabase 本番プロジェクトが未作成
- セキュリティ上の懸念点がいくつか残っている
- OGP 画像など公開に必要なアセットが未作成

## チェックリスト

### 🔴 Critical（デプロイ前に必須）

#### LINE 本番チャネルのセットアップ（開発環境と分離）

- [x] **本番用 Messaging API チャネルを作成**
  - LINE Developers Console → プロバイダー選択 → 「チャネル作成」→「Messaging API」
  - チャネル名・説明・アイコンを本番用に設定
  - 作成後に以下を控える：
    - `Channel Secret`（→ `LINE_CHANNEL_SECRET`）
    - `Channel Access Token`（長期）（→ `LINE_CHANNEL_ACCESS_TOKEN`）
- [x] **プライバシーポリシー・利用規約の URL を設定**
  - LINE Developers Console → Messaging API チャネル → チャネル基本設定
  - プライバシーポリシー URL・利用規約 URL を入力

- [x] **本番用 LINE Login チャネルを作成（LIFF 用）**
  - LINE Developers Console → 「チャネル作成」→「LINE Login」
  - 作成後、「LIFF」タブ → 「追加」
  - LIFF 設定:
    - サイズ: Full
    - Endpoint URL: `https://<本番ドメイン>`（Vercel デプロイ後に設定）
    - Scope: `profile` にチェック
    - Bot リンク: 本番 Messaging API チャネルを選択
  - 作成後に `LIFF ID` を控える（→ `NEXT_PUBLIC_LIFF_ID`）
- [x] **LIFF の Endpoint URL を本番ドメインに更新**

- [x] **本番 Messaging API チャネルの Webhook 設定**
  - Webhook URL: `https://<本番ドメイン>/api/webhook/line`
  - 「Webhook の利用」を ON

- [x] **本番 LIFF ID を Vercel に設定**

- [x] **LINE Secrets を Vercel に設定**
  - `LINE_CHANNEL_SECRET`
  - `LINE_CHANNEL_ACCESS_TOKEN`

- [x] **Supabase Secrets に環境変数追加**
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `APP_URL`
  - `GOOGLE_GENERATIVE_AI_API_KEY`

- [x] **`/api/recipes/parse` に認証チェックを追加**

### 🟡 High（できれば対応）

- [ ] **Supabase 本番プロジェクトを作成**
  - リージョン: 東京（ap-northeast-1）
  - マイグレーション適用: `supabase db push --project-ref <ref>`
  - Secrets 設定後に Edge Functions をデプロイ

- [ ] **本番環境の埋め込みバッチセットアップ**
  - 既存レシピの embedding ベクトルを生成する backfill 処理
  - `npm run backfill:embeddings`（本番 Supabase 接続で実行）
  - 初回デプロイ後に手動実行

- [x] **LINE Webhook URL を本番に切り替え**

- [x] **LIFF の Endpoint URL を本番に切り替え**

### 🟠 Medium（余裕があれば）

- [ ] **LINE Webhook の「テスト」コマンドを無効化 or 制限**
  - 現状: 誰でも「テスト」と送ると最新3件のレシピ一覧が返る
  - 対応案A: `process.env.NODE_ENV === 'development'` のみ有効化
  - 対応案B: 特定の LINE ユーザー ID（管理者）のみ有効化

- [ ] **console.log を本番で非表示に**
  - auth 初期化ログ・LIFF 初期化ログがブラウザコンソールに出力される
  - 対応: `process.env.NODE_ENV !== 'development'` で条件分岐、または ESLint `no-console` ルール追加

- [ ] **API エラーレスポンスの汎用化**
  - 現状: DB エラーメッセージをそのままクライアントに返している箇所がある
  - 対応: 500 系エラーは「エラーが発生しました」などの汎用メッセージに変更し、詳細はサーバーログのみに記録

### 🟢 Low（推奨）

- [ ] **OGP 画像の作成**（1200×630px）
  - SNS シェア時のサムネイル
  - `public/og-image.png` に配置し `app/layout.tsx` で設定

- [ ] **Security Headers の追加**
  - `next.config.ts` に `X-Frame-Options: DENY`・`X-Content-Type-Options: nosniff` 等を追加

- [ ] **Vercel Analytics / Speed Insights の導入**（任意）
  - Core Web Vitals の計測

## 技術的な注意点

### 環境変数の管理方針

| 変数 | 管理場所 | 備考 |
|------|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel Dashboard | 本番 Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel Dashboard | anon key |
| `SUPABASE_SECRET_KEY` | Vercel Dashboard | service_role key（`sb_secret_...` 形式） |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Vercel Dashboard | Gemini API key |
| `NEXT_PUBLIC_LIFF_ID` | Vercel Dashboard | 本番 LIFF ID |
| `LINE_CHANNEL_SECRET` | Vercel Dashboard | Webhook 署名検証に使用 |
| `LINE_CHANNEL_ACCESS_TOKEN` | Vercel + Supabase Secrets | Vercel（Next.js用）と Supabase（Edge Function用）両方に設定 |
| `APP_URL` | Supabase Secrets のみ | Edge Function 内でリンク生成に使用 |

### Supabase 本番デプロイ手順（概略）

```bash
# 1. 本番プロジェクトに接続
supabase link --project-ref <ref>

# 2. マイグレーション適用
supabase db push

# 3. Secrets 設定
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=xxx
supabase secrets set APP_URL=https://<本番ドメイン>

# 4. Edge Functions デプロイ
supabase functions deploy onboarding-scrape
supabase functions deploy get-recipes

# 5. DB 型定義更新（ローカルでの開発用）
supabase gen types typescript --project-ref <ref> > src/types/database.ts
```

### デプロイ後の動作確認チェックリスト

- [ ] LINE ログインが正常に動作する
- [ ] オンボーディングフローが完了する（Edge Function 起動確認）
- [ ] レシピ追加（URL スクレイピング）が動作する
- [ ] レシピ一覧・検索が表示される
- [ ] LINE Push 通知が届く（オンボーディング完了時）

## 参照すべきファイル

- `src/app/api/recipes/parse/route.ts` - 認証追加対象
- `src/app/api/webhook/line/route.ts` - テストコマンド無効化対象
- `src/components/providers/auth-wrapper.tsx` - DevAuth フォールバック確認
- `next.config.ts` - Security Headers 追加対象
- `supabase/functions/onboarding-scrape/index.ts` - Edge Function
- `supabase/functions/get-recipes/index.ts` - Edge Function
