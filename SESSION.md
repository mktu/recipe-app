# セッション引き継ぎ

## 最終更新
2026-03-27 (本番公開準備バックログ作成・Renovate 有効化・LINE 実機確認)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番公開準備中**

## 直近の完了タスク
- [x] **LINE 実機確認**（オンボーディングフロー動作確認済み）
- [x] **Renovate 有効化**（GitHub 側の設定完了）
  - Renovate Only App をインストール
  - リポジトリ Settings → Allow auto-merge を ON
  - ブランチ保護ルール（main）に `lint-and-build` を required status check として追加
- [x] **本番公開準備バックログ作成**（`docs/backlogs/production-launch.md`）
  - 本番公開前チェック（コード・設定・セキュリティ）を実施
  - Critical/High/Medium/Low の優先度別チェックリストを整備
  - LINE 本番チャネル（開発環境と分離）セットアップ手順を含む
- [x] **ビルドエラー修正**（`preferences-form.tsx`）
- [x] **Renovate 自動マージ設定を追加**（`renovate.json`）
- [x] **オンボーディング Edge Function が起動しないバグを修正**
- [x] **オンボーディング待ち画面に「ホームへ戻る」を追加**
- [x] **E2E テスト基盤整備**（PR #19）
- [x] **ホーム header にオンボーディング起動ボタン追加**（PR #18）
- [x] **オンボーディング機能実装・マージ**（PR #17）

## 進行中のタスク
（なし）

## 次にやること（優先度順）
- [ ] **LINE 本番チャネル作成**（開発環境と分離）
  - Messaging API チャネルを新規作成 → Channel Secret・Access Token を取得
  - LINE Login チャネルを新規作成 → LIFF 追加 → LIFF ID を取得
  - LIFF の Bot リンクで Messaging API チャネルと紐づける
  - Webhook URL を本番ドメインに設定（Vercel デプロイ後）
  - 詳細手順: `docs/backlogs/production-launch.md`
- [ ] **Supabase 本番プロジェクト作成**（東京リージョン）
  - マイグレーション適用・Edge Functions デプロイ
  - Secrets 設定（LINE_CHANNEL_ACCESS_TOKEN, APP_URL）
- [ ] **Vercel 環境変数設定**（本番用）
  - `NEXT_PUBLIC_LIFF_ID`（本番 LIFF ID）
  - `LINE_CHANNEL_SECRET`・`LINE_CHANNEL_ACCESS_TOKEN`
  - Supabase 本番プロジェクトの URL・キー
- [ ] **`/api/recipes/parse` に認証チェックを追加**（コード修正・数行）
- [ ] **本番環境の埋め込みバッチ処理セットアップ**
- [ ] **OGP 画像の作成**（1200×630px）
- [ ] **E2E テスト追加**（バックログ参照）
  - ホーム画面（レシピ一覧・検索・食材フィルター）
  - レシピ追加フロー
  - レシピ詳細（メモ編集・削除）

## 保留エピック
- お気に入り（favorites.md）- 「よく見る」と役割が被るため保留

## 将来の改善案（実装保留）
- **検索ログの蓄積** - ユーザーの検索入力を記録して分析に活用
- **埋め込みに食材情報を含める** - タイトル+食材でより精度の高いセマンティック検索
- **ingredients_raw の amount を正しくパース** - 現状は name に量も含む文字列で amount は空

## ブロッカー・注意点
- **ローカル開発でのレシピ取得:** `supabase functions serve` を別ターミナルで起動する必要あり
- **Supabase キー:**
  - `SUPABASE_SECRET_KEY`（`sb_secret_...` 形式）を全体で統一使用
  - Edge Function 呼び出し・サーバークライアント・E2E テストすべてこのキーを使う
  - `playwright.config.ts` が `.env.local` から自動ロード（CI は `$GITHUB_ENV` 経由）
  - Edge Functions 内部は `SUPABASE_SERVICE_ROLE_KEY`（Supabase 自動インジェクト）を使用
- **ローカル DB リセット後の注意:** `supabase db reset` で seed が適用されるが全データ消去される
- **LINE_CHANNEL_ACCESS_TOKEN:** ローカルでは未設定でも警告のみ、スクレイピングは継続
- **食材エイリアス自動生成:**
  - 初回登録時は未マッチのまま（翌日以降のバッチで補完）
- **ローカル開発:** `.env.local` の `NEXT_PUBLIC_LIFF_ID` を空にすると LINE ログインなしで動作
- **DB 型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行
- **本番公開前の Critical 対応項目:**（詳細は `docs/backlogs/production-launch.md`）
  - `NEXT_PUBLIC_LIFF_ID` が空のまま本番デプロイすると DevAuth が有効になる
  - `/api/recipes/parse` に認証チェックがない（Gemini/Jina API コスト漏洩リスク）

## コミット履歴（直近）
```
9f2c437 docs: 本番公開準備バックログを追加・SESSION.md を更新
6bc679a fix: onboarding_sessions テーブルに RLS を有効化
62040f6 docs: update SESSION.md for session handoff
a79d91f fix: usePreferencesForm から user を返し SubmittedView に渡す
febc19b docs: update SESSION.md for session handoff
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `docs/backlogs/production-launch.md` - 本番公開準備チェックリスト（今回新規作成）
- `src/app/api/recipes/parse/route.ts` - 認証チェック追加対象
- `src/app/api/webhook/line/route.ts` - テストコマンド無効化対象
- `src/components/providers/auth-wrapper.tsx` - DevAuth フォールバック確認
- `renovate.json` - Renovate 自動マージ設定
- `src/app/api/onboarding/start/route.ts` - Edge Function キックAPI（修正済み）
- `src/app/api/onboarding/allow-home/route.ts` - ホーム遷移用API（新規追加）
- `playwright.config.ts` - E2E 設定（dotenv ロード・webServer 設定）
- `e2e/fixtures/db.ts` - テスト用 DB ヘルパー
- `docs/backlogs/e2e-testing.md` - E2E テスト計画・シナリオ一覧
- `supabase/functions/onboarding-scrape/index.ts` - バックグラウンドスクレイピング Edge Function
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像
- `CLAUDE.md` - 開発ルール・コマンド・スキル
