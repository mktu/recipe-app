# セッション引き継ぎ

## 最終更新
2026-02-01 (リッチメニュー対応)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番運用開始**

## 直近の完了タスク
- [x] **リッチメニュー対応**
  - ヘルプメッセージ応答実装（`使い方`, `ヘルプ` 等のキーワードに対応）
  - 設定手順を `docs/LINE_SETUP.md` に追記
  - 4ボタン構成: レシピ一覧、食材で探す、レシピ追加、使い方
- [x] **本番環境でのレシピ登録動作確認**
- [x] **本番 DB マイグレーション適用**
- [x] **GitHub Actions でマイグレーション自動化**
- [x] **Vercel デプロイ・本番 Webhook URL 設定**
  - URL: https://recipe-app-wine-three.vercel.app
  - LINE Webhook: https://recipe-app-wine-three.vercel.app/api/webhook/line

## 進行中のタスク
- [ ] **リッチメニュー画像の本番用デザイン作成**
  - 現在はプレースホルダー画像（`assets/rich-menu-placeholder.png`）を使用中

## 次にやること（優先度順）

### リッチメニュー関連
- [x] **LINE Official Account Manager でリッチメニュー設定** - 完了
- [x] **プレースホルダー画像作成** - `assets/rich-menu-placeholder.png`
- [ ] **リッチメニュー画像の本番デザイン作成**
  - サイズ: 2500x1686px
  - Canva 等で作成して差し替え
- [ ] **LP（ランディングページ）作成**
  - 使い方の詳細説明
  - FAQ
  - 友だち追加ボタン

### フェーズ3: 改善・追加機能
- [ ] **テスト用スクリプト作成**
  - `/api/recipes/parse` と `/api/recipes` を使った連続登録スクリプト
  - CI でも利用可能な形式で

### 運用改善（本番運用開始後に検討）
- [ ] **Supabase Pro プランへのアップグレード検討**
  - GitHub Integration でマイグレーション自動適用
  - 現状は GitHub Actions で対応（`.github/workflows/supabase-migrate.yml`）

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
b974e02 feat: add help message response for rich menu support
2c2ba0c docs: update production URLs and migration instructions
f83949c Update SESSION.md for session handoff
622ddbf chore: remove debug logging
9f72696 docs: add Supabase Pro upgrade to future tasks
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
