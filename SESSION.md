# セッション引き継ぎ

## 最終更新
2026-05-17 (LINE SDK パッケージ更新 PR #69)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 直近の完了タスク
- [x] **LINE SDK パッケージ更新（PR #69）**
  - `@line/liff`: 2.27.3 → 2.29.0
  - `@line/bot-sdk`: 10.6.0 → 10.8.0（`Client`/`OAuth` が deprecated に。v11.0.0 への移行は今後別途対応）
  - develop にマージ済み
- [x] **#61 オンボーディング結果が「確認中」のまま固まる不具合修正（PR #67）**
  - 根本原因: Edge Function が LINE 通知に直接 URL を使っていたため LIFF 認証が失敗
  - 修正: `/api/onboarding/start` で LIFF URL を組み立てて Edge Function に渡すよう変更
  - `onboarding-scrape` の `resultUrl` を必須パラメータ化・`APP_URL` フォールバック削除
  - `docs/EDGE_FUNCTIONS.md` のドキュメントも更新済み
  - develop にマージ済み
- [x] **Next.js コアパッケージ更新（PR #64）**
  - develop にマージ済み
- [x] **Node.js v24 LTS へのアップグレード（PR #62）**
  - develop にマージ済み

## 進行中のタスク
なし

## 次にやること（GitHub Issues で管理）
- [ ] **develop → main PR を作成して本番リリース**（#61 修正、Next.js 更新、Node.js v24、LINE SDK 更新を本番反映）
- [ ] **Vercel Dashboard で Node.js バージョンを 24.x に設定**（手動作業）
  - Settings → Build & Development Settings → Node.js Version → 24.x
- [ ] **`@line/bot-sdk` v11.0.0 への移行**（`Client`/`OAuth` → `LineBotClient` への移行作業が必要）
- [ ] **パッケージアップデートの継続**（スキップした項目）
  - `@types/node`: 24 → 25（major、影響調査が必要）
  - G2〜G4, G6〜G7 グループのパッケージ
- [ ] **#45: Vercel Analytics / Speed Insights の導入**
- [ ] **#37〜#39: E2E テスト**

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
- **fnm の PATH:** ターミナル起動時に `eval "$(fnm env --use-on-cd --shell zsh)"` が必要（`~/.zshrc` に設定済み）
- **husky の npx:** fnm の PATH が通っていないと pre-commit フックが失敗する（`eval "$(fnm env --shell zsh)"` を先に実行）
- **#48 画像ホットリンク:** 利用規模が数百人規模になったら `next/image` + ワイルドカード許可を再検討
- **`@types/node` メジャーアップ保留:** 24 → 25 は影響調査が必要なため今回スキップ
- **onboarding-scrape の `APP_URL` 環境変数は不要になった**（PR #67 で削除）
- **`@line/bot-sdk` v11.0.0 の破壊的変更:** `Client`/`OAuth` クラスが削除される。移行時は `LineBotClient` を使用すること

## 参照すべきファイル
- `CLAUDE.md` - プロジェクトガイド
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ブランチ戦略
- `docs/DATABASE_DESIGN.md` - DB設計（RPC関数一覧含む）
- `docs/EDGE_FUNCTIONS.md` - Edge Functions の環境変数・仕様
- `.nvmrc` - Node.js バージョン指定（24）
- `package.json` - 各パッケージバージョン

## コミット履歴（直近）
```
8cd434b Merge pull request #69 from mktu/feature/update-line-sdk-libs
ed8a832 chore: update LINE SDK packages (@line/liff 2.29.0, @line/bot-sdk 10.8.0)
180274a docs: update SESSION.md for session handoff
945c20d Merge pull request #67 from mktu/feature/fix-onboarding-liff-url
449bf52 fix: resultUrl を必須パラメータにして APP_URL フォールバックを削除
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app
