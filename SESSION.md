# セッション引き継ぎ

## 最終更新
2026-05-05 (docs/backlogs/ 整理・GitHub Issues 移行)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 直近の完了タスク
- [x] **docs/backlogs/ の整理**
  - 完了済みバックログ10件を削除（search-ux, cook-count, cooking-time, line-recipe-list, liff-category-filter, onboarding-chat, onboarding-ux-bugs, favorites, e2e-testing, production-launch）
  - 未対応の残タスクを GitHub Issues #37〜#45 に移行
  - CLAUDE.md, docs/ARCHITECTURE.md, requirements.md 等からバックログ参照を除去
  - `docs/backlogs/` ディレクトリごと削除

## 進行中のタスク
なし

## 次にやること（GitHub Issues で管理）
- [ ] **#40: LINE Webhook「テスト」コマンドを無効化**
- [ ] **#41: console.log を本番で非表示に**
- [ ] **#42: API エラーレスポンスの汎用化**
- [ ] **#43: OGP 画像の作成**
- [ ] **#44: Security Headers の追加**
- [ ] **#45: Vercel Analytics / Speed Insights の導入**
- [ ] **#37: E2E: レシピ追加フローのテスト**
- [ ] **#38: E2E: ホーム画面のテスト**
- [ ] **#39: E2E: レシピ詳細画面のテスト**

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
- `CLAUDE.md` - プロジェクトガイド（バックログ参照を更新済み）
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ブランチ戦略

## コミット履歴（直近）
```
b1efaf7 chore: docs/backlogs/ を削除し残タスクを GitHub Issues に移行
7767cd7 fix: IngredientSelector に重複 ID が渡された際の key 重複エラーを修正
0e514d2 feat: レシピ情報の再取得・メイン食材編集機能を追加 (Issue #33)
2d451b6 docs: update SESSION.md for session handoff
907239e refactor: レシピカードマッピングを recipe-card-mapper に集約
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app
