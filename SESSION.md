# セッション引き継ぎ

## 最終更新
2026-03-07 (オンボーディングチャット機能のバックログ作成・事前確認完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **一般公開準備完了**

## 直近の完了タスク
- [x] **オンボーディングチャット機能のバックログ作成**
  - `docs/backlogs/onboarding-chat.md` を新規作成
  - 初回レシピ登録障壁の解決策を議論・設計
  - バックグラウンド収集 + LINE 通知方式に決定
- [x] **スクレイピング検証**
  - `scripts/test-onboarding-scrape.ts` を作成・実行
  - DELISH KITCHEN (`?q=`) / Nadia (`?keyword=`) の検索URLを確認
  - 両サービスとも 2秒以内で5件取得可能と確認
- [x] **事前確認事項をすべて解決・決定**
  - Edge Function 非同期実行: `EdgeRuntime.waitUntil()` で対応可能（Free プラン 150秒以内に収まる）
  - LINE User ID: `users.line_user_id` に保存済みで追加対応不要
  - スキップ時: 案A（`onboarding_completed_at` 設定）+ 「レシピを探してもらう」再実行機能
  - 既存ユーザー: マイグレーションで完了済み扱いに一括更新（案B）
  - 期限切れ: 「もう一度試してください」表示 → オンボーディングトップへ誘導
  - Nadia 検索精度: ミスマッチは許容範囲
  - robots.txt: 両サービスとも問題なし（Nadia は AI クローラーブロックあるが Browser UA のため非該当）
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
20e19b3 docs: update SESSION.md for session handoff
49e7585 fix: よく見る一覧カードに調理時間と材料数を表示
8cbc03a docs: バックログ README のLIFF絞り込みエピックを完了に更新
b06cf7d Merge pull request #16 from mktu/feature/fix-line-card-cross-fields
5ef3df5 fix: LINEカードの時短・材料少なめで両フィールドを表示し横並びに変更
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `docs/backlogs/onboarding-chat.md` - オンボーディングチャット機能のバックログ（事前確認事項含む）
- `scripts/test-onboarding-scrape.ts` - スクレイピング検証スクリプト
- `docs/backlogs/README.md` - エピック一覧
- `requirements.md` - プロダクト要件（ユースケース・機能要件）
- `CLAUDE.md` - 開発ルール・コマンド・スキル
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ディレクトリ構造
- `src/lib/scraper/html-fetcher.ts` - HTML 取得（Browser UA 設定）
- `src/lib/scraper/json-ld-extractor.ts` - DELISH KITCHEN 向け JSON-LD 抽出
- `src/lib/scraper/next-data-extractor.ts` - Nadia 向け __NEXT_DATA__ 抽出
- `supabase/functions/generate-embeddings/index.ts` - Edge Function の実装パターン参考
