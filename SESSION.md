# セッション引き継ぎ

## 最終更新
2026-01-30 (ドキュメント分離)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - 準備中

## 直近の完了タスク
- [x] **ドキュメント分離**
  - CLAUDE.md (333→238行) と requirements.md (361→211行) を軽量化
  - `docs/LINE_SETUP.md` - LINE開発環境構成
  - `docs/SUPABASE_LOCAL.md` - ローカルSupabaseセットアップ
  - `docs/DATABASE_DESIGN.md` - DB設計詳細
- [x] LINE 開発環境構成の設計・ドキュメント化
- [x] LINE チャネル作成（LIFF ID・環境変数設定済み）

## 進行中のタスク
なし

## 次にやること（優先度順）

### フェーズ3: Webhook 実装
- [ ] **Webhook エンドポイント作成**
  - `/api/webhook/line` を実装
  - LINE 署名検証
  - URL 検出ロジック
- [ ] **URL 受信 → レシピ解析 → 保存**
  - 既存の `parseRecipe()` を再利用
  - ユーザー特定（LINE user ID → users テーブル）
- [ ] **応答メッセージ**
  - 保存完了時にリッチメッセージで通知
- [ ] **ngrok でローカルテスト**

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
c39d94a docs: split large documentation into focused files
9bc5955 Update SESSION.md for session handoff
801ab1d docs: add custom command for unmatch analysis
d9afd9c Add script to check ingredient match rate
921c123 feat: record unmatched ingredients instead of auto-creating
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `docs/` - 詳細ドキュメント（LINE設定、Supabase、DB設計）
- `src/lib/recipe/parse-recipe.ts` - レシピ解析ロジック（Webhook で再利用）
- `src/lib/recipe/match-ingredients.ts` - 食材マッチングロジック
