# セッション引き継ぎ

## 最終更新
2026-03-10 (アーキテクチャ・DBドキュメント整備、doc-check スラッシュコマンド追加)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **一般公開準備完了**

## 直近の完了タスク
- [x] **ドキュメントと実装の乖離チェック・修正**
  - `docs/ARCHITECTURE.md`: `src/lib/async/` をディレクトリ構造に追記
  - `docs/DATABASE_DESIGN.md`: `recipes` の埋め込み関連カラム3件追記、`ingredient_aliases` の2カラム追記、`unmatched_ingredients` テーブル定義追加、RPC関数セクション新設
- [x] **doc-check スラッシュコマンド追加**（`.claude/commands/`）
  - `/doc-check-structure`: 構造レベルの乖離チェック
  - `/doc-check-logic [セクション名]`: フローチャート・説明文の意味的検証（git diff から自動推論）
- [x] **友達追加時のユーザー登録・ウェルカムメッセージ実装**（前セッション）

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
  - ウェルカムメッセージをオンボーディング誘導に更新（`route.ts` の `welcomeText`）
- [ ] **LINE 実機確認**（友達追加時のユーザー登録・ウェルカムメッセージ / 時短カード・材料少なめカードの「さらに見る →」動作確認）
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
337d040 docs: アーキテクチャ・DB設計ドキュメントを実装と同期
0ca1837 docs: update SESSION.md for session handoff
2c43f29 docs: 認証フロー図をユーザー登録タイミングの実態に合わせて更新
5882c56 feat: 友達追加時にユーザー登録とウェルカムメッセージを送信
cb19009 docs: update SESSION.md for session handoff
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `docs/backlogs/onboarding-chat.md` - オンボーディングチャット機能のバックログ（事前確認事項含む）
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ディレクトリ構造（今セッションで更新済み）
- `docs/DATABASE_DESIGN.md` - DBスキーマ詳細（今セッションで更新済み）
- `.claude/commands/doc-check-structure.md` - 構造乖離チェックコマンド
- `.claude/commands/doc-check-logic.md` - ロジック意味的検証コマンド
- `src/app/api/webhook/line/route.ts` - LINE Webhook エントリポイント（`handleFollowEvent` 追加済み）
- `src/lib/line/category-handler.ts` - 「探す」クイックリプライ・カテゴリハンドラー
- `docs/backlogs/README.md` - エピック一覧
- `requirements.md` - プロダクト要件（ユースケース・機能要件）
- `CLAUDE.md` - 開発ルール・コマンド・スキル
