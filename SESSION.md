# セッション引き継ぎ

## 最終更新
2026-04-05 (本番環境 pg_cron セットアップ・cron ジョブ動作確認)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 直近の完了タスク
- [x] **本番環境 pg_cron セットアップ**
  - pg_cron / pg_net 有効化
  - generate-embeddings（5分毎）、auto-alias-daily（JST 03:00）、cleanup-cron-logs（毎日深夜）の3ジョブ登録・動作確認
- [x] **LINE 本番チャネル作成**（Messaging API + LINE Login + LIFF）
- [x] **Supabase 本番プロジェクト作成**（東京リージョン）
  - マイグレーション適用（17件）
  - Edge Functions デプロイ（4関数）
  - Secrets 設定（LINE_CHANNEL_ACCESS_TOKEN, GOOGLE_GENERATIVE_AI_API_KEY, APP_URL）
- [x] **Vercel 環境変数設定**（Production/Preview 分離）
- [x] **`develop` ブランチ作成**（staging ブランチ）
- [x] **CI ワークフロー更新**（develop→staging, main→本番 の分離デプロイ）
- [x] **`/api/recipes/parse` に認証チェックを追加**（lineUserId による認証）
- [x] **プライバシーポリシー・利用規約 URL を LINE に設定**
- [x] **staging LINE Webhook 修正**
  - Vercel Preview の Deployment Protection を無効化（Standard Protection → Off）
  - これにより LINE サーバーからの Webhook が 401 で弾かれる問題を解消
- [x] **ドキュメント整備**
  - ARCHITECTURE.md: staging/production 環境構成・CI/CD ブランチ戦略を更新
  - LINE_SETUP.md: dev/prod 4チャネル構成に更新
  - CLAUDE.md: develop ブランチを含むワークフローに更新
  - SUPABASE_LOCAL.md / EMBEDDING_BATCH_SETUP.md: ブランチ別デプロイ先を追記
  - production-launch.md: 完了済みタスクをチェック済みに更新

## 進行中のタスク
なし

## 次にやること（優先度順）
- [ ] **🟠 Medium: LINE Webhook「テスト」コマンドを無効化**
- [ ] **🟠 Medium: `console.log` を本番で非表示に**
- [ ] **🟠 Medium: API エラーレスポンスの汎用化**
- [ ] **🟢 Low: Security Headers の追加**（`next.config.ts`）
- [ ] **🟢 Low: OGP 画像の作成**（1200×630px）

## ブロッカー・注意点
- **Vercel Preview の Deployment Protection は Off にしている**
  - staging の LINE Webhook を通すために必要
  - develop ブランチの Preview URL が公開状態になっている
- **staging LINE チャネルの Webhook URL**
  - `https://recipe-app-git-develop-mktus-projects.vercel.app/api/webhook/line`
  - ngrok でローカルテストする際は一時的にこの URL を ngrok URL に変更し、テスト後に戻す
- **ローカル開発でのレシピ取得:** `supabase functions serve` を別ターミナルで起動する必要あり
- **Supabase キー:**
  - `SUPABASE_SECRET_KEY`（`sb_secret_...` 形式）を全体で統一使用
  - Edge Functions 内部は `SUPABASE_SERVICE_ROLE_KEY`（Supabase 自動インジェクト）を使用
- **ローカル DB リセット後の注意:** `supabase db reset` で seed が適用されるが全データ消去される
- **ローカル開発:** `.env.local` の `NEXT_PUBLIC_LIFF_ID` を空にすると LINE ログインなしで動作
- **DB 型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行

## 参照すべきファイル
- `docs/backlogs/production-launch.md` - 本番公開準備チェックリスト
- `docs/EMBEDDING_BATCH_SETUP.md` - pg_cron / 埋め込みバッチのセットアップ手順
- `docs/EDGE_FUNCTIONS.md` - Edge Functions 開発ガイド（auto-alias 含む）
- `scripts/setup-cron.ts` - cron ジョブ登録用 SQL 生成スクリプト
- `docs/LINE_SETUP.md` - LINE チャネル構成・環境別設定
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ブランチ戦略

## コミット履歴（直近）
```
074718c docs: update SESSION.md for session handoff
3b1fb65 docs: ブランチ戦略・環境構成・LINEチャネル構成をドキュメントに反映
4a2d2a4 fix: /api/recipes/parse に lineUserId による認証チェックを追加
f2adcff ci: develop/main ブランチで staging/production を分離デプロイ
5ba3084 docs: update SESSION.md for session handoff
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app
