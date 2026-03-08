# セッション引き継ぎ

## 最終更新
2026-03-08 (「探す」クイックリストに最近追加を追加・カード余白修正)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **一般公開準備完了**

## 直近の完了タスク
- [x] **「探す」クイックリストに「🆕 最近追加」を追加**
  - `fetchRecentlyAddedForBot`（created_at DESC）を `search-recipes.ts` に追加
  - `isRecentlyAddedKeyword` / `handleRecentlyAdded` を `category-handler.ts` に追加
  - クイックリプライ先頭に `🆕 最近追加` を追加（計4択）
  - webhook ルートにハンドラーを登録
- [x] **レシピカードの調理時間・品数の余白を修正**
  - `flex: 1` → `flex: 0` + `margin: 'md'` でコンテンツ幅に詰める
- [x] **オンボーディングチャット機能のバックログ作成**（前セッション）
- [x] **よく見る一覧カードに調理時間・材料数を表示**（前セッション）

## 進行中のタスク
（なし）

## 次にやること（優先度順）
- [ ] **オンボーディングチャット機能の実装**（`docs/backlogs/onboarding-chat.md` 参照）
  - DB マイグレーション（`onboarding_completed_at`、`onboarding_sessions` テーブル）
  - チャット UI（`/onboarding` LIFF ページ、`useChat`）
  - チャット API（`/api/onboarding/chat`、Gemini でヒアリング）
  - 収集ジョブ起動 API（`/api/onboarding/start`）
  - バックグラウンドスクレイピング Edge Function（`EdgeRuntime.waitUntil()`）
  - LINE 通知 → 候補選択 UI → 一括登録
- [ ] **LINE 実機確認**（時短カード・材料少なめカードの「さらに見る →」動作確認）
- [ ] **本番環境の Supabase プロジェクト作成**（東京リージョン）
- [ ] **本番環境の埋め込みバッチ処理セットアップ**
- [ ] **OGP 画像の作成**（1200×630px）

## 保留エピック
- お気に入り（favorites.md）- 「よく見る」と役割が被るため保留

## 検討事項（次回以降）
- `preview:flex` に `| pbcopy` を追加してクリップボード自動コピーにする（小改善）

## 将来の改善案（実装保留）
- **検索ログの蓄積** - ユーザーの検索入力を記録して分析に活用
- **埋め込みに食材情報を含める** - タイトル+食材でより精度の高いセマンティック検索
- **ingredients_raw の amount を正しくパース** - 現状は name に量も含む文字列で amount は空

## ブロッカー・注意点
- **ローカル開発でのレシピ取得:** `supabase functions serve` を別ターミナルで起動する必要あり（Edge Function ランタイムが `supabase start` では自動起動しない）
- **NEXT_PUBLIC_APP_URL**: Vercel の環境変数設定済み。ローカルは `.env.local` に `http://localhost:3000`
- **Edge Functions の JWT 検証:**
  - `config.toml` で `verify_jwt = false` を設定済み
  - CI からのデプロイで自動的に適用される
- **食材エイリアス自動生成:**
  - 初回登録時は未マッチのまま（翌日以降のバッチで補完）
  - Edge Function は非同期パターン（202 Accepted を即座に返す）
  - ローカルテスト: `npx tsx scripts/auto-alias.ts --dry-run`
- **Edge Function 開発:**
  - 共有ロジック変更後は `npm run functions:build` を実行
  - 詳細は `docs/EDGE_FUNCTIONS.md` を参照
- **LIFF 認証:**
  - LINE Login チャネルは「公開済み」ステータスが必要
  - LIFF SDK には自動トークンリフレッシュ機能がない
- **ベクトル検索閾値:** 0.75 に設定済み
- **埋め込みバッチ処理:**
  - レシピ登録時は `title_embedding = NULL` で保存される
  - 5分毎に Edge Function が埋め込みを生成
- **ローカル開発:** `.env.local` の `NEXT_PUBLIC_LIFF_ID` を空にすると LINE ログインなしで動作
- ローカル開発時は `supabase start` で起動が必要
- **DB 型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行（先頭行の不要な出力を削除すること）
- **GitHub Secrets:** `SUPABASE_ACCESS_TOKEN` と `SUPABASE_PROJECT_REF` が必要（CI 用）

## コミット履歴（直近）
```
60a5190 fix: レシピカードの調理時間と品数の間の余白を詰める
2ee7c16 feat: 「探す」クイックリストに最近追加したレシピを追加
65edea1 docs: update SESSION.md and add onboarding-chat backlog
20e19b3 docs: update SESSION.md for session handoff
49e7585 fix: よく見る一覧カードに調理時間と材料数を表示
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `docs/backlogs/onboarding-chat.md` - オンボーディングチャット機能のバックログ（事前確認事項含む）
- `src/lib/line/category-handler.ts` - 「探す」クイックリプライ・カテゴリハンドラー
- `src/lib/line/search-recipes.ts` - LINE Bot 用レシピ取得クエリ
- `src/lib/line/flex-message.ts` - LINE Flex Message 生成
- `src/app/api/webhook/line/route.ts` - LINE Webhook エントリポイント
- `docs/backlogs/README.md` - エピック一覧
- `requirements.md` - プロダクト要件（ユースケース・機能要件）
- `CLAUDE.md` - 開発ルール・コマンド・スキル
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ディレクトリ構造
