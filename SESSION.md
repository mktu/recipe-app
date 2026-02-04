# セッション引き継ぎ

## 最終更新
2026-02-04 (ブランチ戦略・CI導入)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **Bot検索機能完了・本番DB整備完了**

## 直近の完了タスク
- [x] **ブランチ戦略の導入（GitHub Flow）**
  - `main` 保護 + `feature/*` ブランチ運用
  - CLAUDE.md にブランチ戦略セクション追加
- [x] **CI ワークフロー追加**
  - `.github/workflows/ci.yml` - PR時に lint + build 実行

## 進行中のタスク
なし

## 次にやること（優先度順）
- [ ] **GitHub で main ブランチ保護設定**（手動）
  - https://github.com/mktu/recipe-app/settings/branches
  - Require PR, Require status checks (`lint-and-build`)
- [ ] リッチメニュー画像の本番デザイン作成
- [ ] LP（ランディングページ）作成
- [ ] テスト用スクリプト作成

## ブロッカー・注意点
- ローカル開発時は `supabase start` で起動が必要
- **RLS注意:** Webhookでは `createServerClient`（Secret Key）を使用すること
- **Gemini API無料枠:** `gemini-2.5-flash` を使用（20 requests/day程度）
- **DB型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行
- **GitHub Secrets:** `SUPABASE_ACCESS_TOKEN` と `SUPABASE_PROJECT_REF` が必要（CI用）
- **マイグレーション順序:** 食材マスター → エイリアスの順で適用される（タイムスタンプで制御）
- **ブランチ運用:** これ以降は `feature/*` → PR → main マージの流れ

## コミット履歴（直近）
```
f83316b chore: add branch strategy and CI workflow
4378f03 docs: update SESSION.md for session handoff
b39fed2 feat: add ingredient master data migration and CI test workflow
c6b79ad docs: update SESSION.md for session handoff
15dc36d feat: add ingredient aliases for search flexibility
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド（ブランチ戦略追記済み）
- `.github/workflows/ci.yml` - lint + build CI **[今回追加]**
- `.github/workflows/supabase-migrate.yml` - 本番DBマイグレーション（mainプッシュ時）
- `.github/workflows/test-migrations.yml` - マイグレーションテスト（PR時）
- `src/app/api/webhook/line/route.ts` - LINE Webhook エンドポイント
- `src/lib/line/search-handler.ts` - Bot検索ハンドラ
