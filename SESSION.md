# セッション引き継ぎ

## 最終更新
2026-03-18 (Nadia → クラシル差し替え完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **一般公開準備完了**

## 直近の完了タスク
- [x] **オンボーディング機能実装・マージ**（PR #17）
  - フォーム形式（食材サジェスト付き入力 + 調理時間 Select）
  - Supabase Edge Function バックグラウンドスクレイピング（DELISH KITCHEN + クラシル）
  - LINE push 通知・候補選択 UI・一括登録
  - `OnboardingGuard` による初回リダイレクト制御
  - `ingredient-suggest-input`: Popover + Command、バッジを入力欄の下に配置
  - レシピ候補カード: サイト名表示 + 元ページリンク
  - ローカル DB マイグレーション適用済み
  - ドキュメント更新: `DATABASE_DESIGN.md`, `EDGE_FUNCTIONS.md`, `ARCHITECTURE.md`, `backlogs/onboarding-chat.md`
- [x] **アーキテクチャドキュメントにオンボーディングフロー図を追記**（mermaid sequenceDiagram）
- [x] **Nadia スクレイピングの調査・クラシルへ差し替え**
  - Nadia の検索ページは SPA のため常に同一 30 件が返るバグを確認
  - クラシル（kurashiru.com）は SSR + JSON-LD で正常動作することを検証
  - `onboarding-scrape` Edge Function・テストスクリプト・ドキュメントを更新

## 進行中のタスク
（なし）

## 次にやること（優先度順）
- [ ] **Supabase secrets に環境変数追加**（本番デプロイ時）
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `APP_URL`
- [ ] **LINE 実機確認**（友達追加時のウェルカム FlexMessage / オンボーディングフロー）
- [ ] **本番環境の Supabase プロジェクト作成**（東京リージョン）
- [ ] **本番環境の埋め込みバッチ処理セットアップ**
- [ ] **OGP 画像の作成**（1200×630px）

## 保留エピック
- お気に入り（favorites.md）- 「よく見る」と役割が被るため保留

## 将来の改善案（実装保留）
- **検索ログの蓄積** - ユーザーの検索入力を記録して分析に活用
- **埋め込みに食材情報を含める** - タイトル+食材でより精度の高いセマンティック検索
- **ingredients_raw の amount を正しくパース** - 現状は name に量も含む文字列で amount は空

## ブロッカー・注意点
- **ローカル開発でのレシピ取得:** `supabase functions serve` を別ターミナルで起動する必要あり
- **Edge Function 呼び出しの JWT:**
  - `start/route.ts` から Edge Function を呼ぶ際は `SUPABASE_SERVICE_ROLE_KEY`（JWT 形式）を使用
  - ローカルの値は `supabase status --output env | grep SERVICE_ROLE_KEY` で取得
  - `sb_secret_...` 形式のキーは Edge Runtime が認識しないため使用不可
- **LINE_CHANNEL_ACCESS_TOKEN:** ローカルでは未設定でも警告のみ、スクレイピングは継続
- **食材エイリアス自動生成:**
  - 初回登録時は未マッチのまま（翌日以降のバッチで補完）
- **ローカル開発:** `.env.local` の `NEXT_PUBLIC_LIFF_ID` を空にすると LINE ログインなしで動作
- **DB 型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行

## コミット履歴（直近）
```
bfa8df4 fix: オンボーディングスクレイピングの Nadia をクラシルに差し替え
a7796d4 docs: update SESSION.md for session handoff
48bf66c docs: オンボーディングフローをアーキテクチャドキュメントに追記
c859933 docs: update SESSION.md for session handoff
5f837d3 feat: オンボーディング UI 改善とスクレイプ動作確認ログ追加
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `supabase/functions/onboarding-scrape/index.ts` - バックグラウンドスクレイピング Edge Function（DELISH KITCHEN + クラシル）
- `scripts/test-onboarding-scrape.ts` - スクレイピング動作確認スクリプト
- `src/components/features/onboarding/` - オンボーディング UI コンポーネント
- `src/app/api/onboarding/` - オンボーディング API ルート
- `src/components/providers/onboarding-guard.tsx` - リダイレクト制御
- `supabase/migrations/20260311000000_add_onboarding.sql` - オンボーディング用マイグレーション
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像
- `docs/DATABASE_DESIGN.md` - テーブル設計
- `docs/EDGE_FUNCTIONS.md` - Edge Functions ガイド
- `docs/backlogs/onboarding-chat.md` - オンボーディングエピック（Nadia → クラシル差し替えの経緯を記載）
- `CLAUDE.md` - 開発ルール・コマンド・スキル
