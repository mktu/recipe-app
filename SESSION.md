# セッション引き継ぎ

## 最終更新
2026-02-27 (クイックリプライ関連の修正・バグ修正 PR #11〜#14 マージ済み)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **一般公開準備完了**

## 直近の完了タスク
- [x] **「探す」案内文改善・お気に入り除去（PR #14）**
  - キーワード検索の説明を先に表示
  - Quick Reply を3択（よく見る / 材料少なめ / 時短）に整理
  - お気に入りは favorites epic ごと保留
- [x] **cooking_time_minutes 保存バグ修正（PR #13）**
  - LINE Bot・テストスクリプト両方で `cookingTimeMinutes` を渡し忘れていた
- [x] **「よく作る」→「よく見る」リネーム（PR #12）**
- [x] **「探す」クイックリプライ実装（PR #11）**
  - 「探す」→ Quick Reply 3択（よく見る / 材料少なめ / 時短）
  - RPC関数追加（ingredients_raw 配列長 / cooking_time_minutes）
  - category-handler.ts・url-handler.ts を新規作成
- [x] **「最近見た」「よく見る」レシピ機能を追加**
- [x] **cooking_time_minutes 実装（PR #10 マージ済み）**（前セッション）

## 進行中のタスク
（なし）

## 次にやること（優先度順）
- [ ] **LINE 実機確認**（「探す」クイックリプライ動作テスト）
- [ ] **既存レシピの cooking_time_minutes バックフィル**（20件全部 NULL のため）
- [ ] **本番環境のSupabaseプロジェクト作成**
  - **東京リージョン（Northeast Asia - Tokyo）で作成すること**
- [ ] **本番環境の埋め込みバッチ処理セットアップ**
  - `docs/EMBEDDING_BATCH_SETUP.md` に沿って設定
- [ ] **OGP画像の作成**（1200×630px）

## 保留エピック
- お気に入り（favorites.md）- 「よく見る」と役割が被るため保留

## 検討事項（次回以降）
- `preview:flex` に `| pbcopy` を追加してクリップボード自動コピーにする（小改善）

## 将来の改善案（実装保留）
- **検索ログの蓄積** - ユーザーの検索入力を記録して分析に活用
- **埋め込みに食材情報を含める** - タイトル+食材でより精度の高いセマンティック検索

## ブロッカー・注意点
- **cooking_time_minutes**: PR #13 修正後の新規登録レシピから保存される。既存20件は NULL
- **NEXT_PUBLIC_APP_URL**: Vercel の環境変数設定済み。ローカルは `.env.local` に `http://localhost:3000`
- **Edge Functions の JWT 検証:**
  - `config.toml` で `verify_jwt = false` を設定済み
  - CI からのデプロイで自動的に適用される
- **食材エイリアス自動生成:**
  - 初回登録時は未マッチのまま（翌日以降のバッチで補完）
  - Edge Functionは非同期パターン（202 Acceptedを即座に返す）
  - ローカルテスト: `npx tsx scripts/auto-alias.ts --dry-run`
- **Edge Function開発:**
  - 共有ロジック変更後は `npm run functions:build` を実行
  - 詳細は `docs/EDGE_FUNCTIONS.md` を参照
- **LIFF認証:**
  - LINE Loginチャネルは「公開済み」ステータスが必要
  - LIFF SDKには自動トークンリフレッシュ機能がない
- **ベクトル検索閾値:** 0.75 に設定済み
- **埋め込みバッチ処理:**
  - レシピ登録時は `title_embedding = NULL` で保存される
  - 5分毎に Edge Function が埋め込みを生成
- **ローカル開発:** `.env.local` の `NEXT_PUBLIC_LIFF_ID` を空にするとLINEログインなしで動作
- ローカル開発時は `supabase start` で起動が必要
- **DB型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行
- **GitHub Secrets:** `SUPABASE_ACCESS_TOKEN` と `SUPABASE_PROJECT_REF` が必要（CI用）

## コミット履歴（直近）
```
7a211d4 fix: 「探す」の案内文を改善・お気に入りをQuick Replyから除去
87b55ea fix: レシピ登録時に cooking_time_minutes が保存されないバグを修正
bf59fe9 fix: クイックリプライの「よく作る」を「よく見る」に変更
2b46123 feat: 「探す」キーワードでカテゴリ選択クイックリプライを追加
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロダクト要件（ユースケース・機能要件）
- `CLAUDE.md` - 開発ルール・コマンド・スキル
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ディレクトリ構造
- `docs/backlogs/README.md` - エピック一覧
- `src/lib/line/category-handler.ts` - カテゴリ選択 Quick Reply ロジック
- `src/lib/line/url-handler.ts` - URL処理（レシピ保存）ロジック
- `src/lib/line/search-handler.ts` - LINE キーワードハンドラー
- `src/app/api/track/recipe/[id]/route.ts` - トラッキングエンドポイント
- `scripts/preview-flex.ts` - Flex Message プレビュー用スクリプト
