# セッション引き継ぎ

## 最終更新
2026-02-01 (Vercel デプロイ完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番デプロイ完了**

## 直近の完了タスク
- [x] **Vercel デプロイ・本番 Webhook URL 設定**
  - URL: https://recipe-app-wine-three.vercel.app
  - LINE Webhook: https://recipe-app-wine-three.vercel.app/api/webhook/line
  - 疎通確認済み
- [x] **Supabase API キー命名規則の移行**
  - `ANON_KEY` → `PUBLISHABLE_KEY`
  - `SERVICE_ROLE_KEY` → `SECRET_KEY`
- [x] Webhook エンドポイント作成・テスト完了 (`/api/webhook/line`)
- [x] ドキュメント分離
- [x] LINE チャネル作成（LIFF ID・環境変数設定済み）

## 進行中のタスク
なし

## 次にやること（優先度順）

### フェーズ3: 改善・追加機能
- [ ] **テスト用スクリプト作成**
  - `/api/recipes/parse` と `/api/recipes` を使った連続登録スクリプト
  - CI でも利用可能な形式で

### フェーズ2残件（保留中）
- [ ] 食材マッチング改善（アンマッチ率 79.7%）
  - → データを貯めてから方針決定予定

## ブロッカー・注意点
- ローカル開発時は `supabase start` で起動が必要
- **ngrok:** ローカル開発時に Webhook URL として使用（無料版は URL が毎回変わる）
- **Gemini API無料枠:** `gemini-2.5-flash` を使用（20 requests/day程度）
- **DB型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行

## コミット履歴（直近）
```
3bbd07e feat: add LINE Webhook endpoint for recipe registration
8a6628a Update SESSION.md for session handoff
c39d94a docs: split large documentation into focused files
9bc5955 Update SESSION.md for session handoff
801ab1d docs: add custom command for unmatch analysis
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `docs/` - 詳細ドキュメント（LINE設定、Supabase、DB設計）
- `src/app/api/webhook/line/route.ts` - LINE Webhook エンドポイント
- `src/lib/recipe/parse-recipe.ts` - レシピ解析ロジック
- `src/lib/recipe/match-ingredients.ts` - 食材マッチングロジック
