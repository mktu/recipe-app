# セッション引き継ぎ

## 最終更新
2026-05-24 (Issue #79 オンボーディング機能削除 PR #88 マージ、ドキュメント更新完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 直近の完了タスク
- [x] **#79 オンボーディング機能の削除（PR #88）**
  - DELISH KITCHEN・クラシルの自動スクレイピングは著作権・ToS リスクあり
  - 関連ファイル一式削除（onboarding ページ・API・Edge Function・E2E テスト等）
  - DB マイグレーション追加（`onboarding_sessions` テーブル・カラム・RPC 関数削除）
  - LINE Bot ウェルカムメッセージをシンプルなテキストに変更
  - CI エラー修正（config.toml の stale エントリ削除）→ develop に直接 push 済み
  - 関連 Issues #83 #84 #85 も手動クローズ
- [x] **ドキュメント更新（ARCHITECTURE.md・DATABASE_DESIGN.md）**
  - オンボーディング関連記述を全て削除
  - レシピ解析フロー図にユーザー確認ステップを追加
  - `src/lib/api/` をディレクトリ構造に追加
- [x] **#45 Vercel Analytics / Speed Insights 導入（PR #77）**
- [x] **#65 オンボーディング結果画面にマスターチェックボックス追加（PR #75）**
- [x] **@line/bot-sdk 更新（PR #73）**
- [x] **@supabase/supabase-js 更新（PR #71）**

## 進行中のタスク
なし

## 次にやること（GitHub Issues で管理）
- [ ] **develop → main PR を作成して本番リリース**（#79 オンボーディング削除、Vercel Analytics 等を本番反映）
- [ ] **Vercel Dashboard で Node.js バージョンを 24.x に設定**（手動作業）
  - Settings → Build & Development Settings → Node.js Version → 24.x
- [ ] **パッケージアップデートの継続**（スキップした項目）
  - `@supabase/supabase-js`: 2.106.0（patch）
  - `@types/node`: 24 → 25（major、影響調査が必要）
  - G3: AI SDK（`ai` 6.0.48→6.0.184、`@ai-sdk/google` 3.0.13→3.0.75）
  - G4: UI / スタイリング（`lucide-react` major あり要注意）
  - G6: 開発ツール（`typescript` 5→6、`eslint` 9→10、`lint-staged` 16→17 など major 多数）
  - G7: その他（`swr`、`zod`、`schema-dts` 1→2 major）
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
- **Vercel Analytics:** デプロイ後に Vercel Dashboard の Analytics / Speed Insights タブで計測開始を確認すること

## 参照すべきファイル
- `CLAUDE.md` - プロジェクトガイド
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ブランチ戦略
- `docs/DATABASE_DESIGN.md` - DB設計（RPC関数一覧含む）
- `docs/EDGE_FUNCTIONS.md` - Edge Functions の環境変数・仕様
- `.nvmrc` - Node.js バージョン指定（24）
- `package.json` - 各パッケージバージョン
- `.claude/skills/update-packages/SKILL.md` - パッケージ更新スキル（Phase 4 改善済み）

## コミット履歴（直近）
```
ec16e1e docs: add src/lib/api/ to ARCHITECTURE.md directory structure
664122e docs: レシピ解析フロー図にユーザー確認ステップを追加
c149503 docs: オンボーディング機能削除に伴いドキュメントを更新
960a7a4 fix: supabase/config.toml から onboarding-scrape の関数定義を削除
1908bb3 Merge pull request #88 from mktu/feature/remove-onboarding
c413451 feat: オンボーディング機能を削除（Issue #79 著作権リスク対応）
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app
