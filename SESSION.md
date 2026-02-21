# セッション引き継ぎ

## 最終更新
2026-02-21 (LINEチャット縦リスト型Flex Message 実装完了・セッション終了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **一般公開準備完了**

## 直近の完了タスク
- [x] **LINEチャット縦リスト型 Flex Message への変更**
  - カルーセル（横スクロール複数バブル）を廃止し、1バブル縦リストに統一
  - 各アイテム: サムネイル + タイトル + ソース名、タップで LIFF `/recipes/:id` へ遷移
  - 検索結果が全件表示（5件以下）の場合はフッターボタンを非表示
  - `preview:flex` スクリプト追加（デプロイ前にシミュレーターで確認可能）

## 進行中のタスク
- [ ] **LP「シンプルで使いやすい」セクションの画像用意**
  - LINEトーク画面（URL送信）と解析結果確認画面の2枚構成を予定
  - ユーザーがスクリーンショットを用意中

## 次にやること（優先度順）
- [ ] **LINEチャット縦リストの実機動作確認**
  - `テスト` → 縦リスト表示
  - 食材名・料理名検索 → 最大5件表示
  - 各アイテムタップ → LIFF `/recipes/:id` へ遷移
  - 6件以上のとき → フッターボタン表示
- [ ] **LP「シンプルで使いやすい」セクションの画像追加**
  - `screenshot-section.tsx` を更新
- [ ] **本番環境のSupabaseプロジェクト作成**
  - **東京リージョン（Northeast Asia - Tokyo）で作成すること**
- [ ] **本番環境の埋め込みバッチ処理セットアップ**
  - `docs/EMBEDDING_BATCH_SETUP.md` に沿って設定
- [ ] **OGP画像の作成**（1200×630px）
- [ ] **エピック実装（詳細は `docs/backlogs/README.md` 参照）**
  - お気に入り + 調理回数（favorites.md）
  - 探すボトムシート（search-ux.md）

## 検討事項（次回以降）
- `preview:flex` に `| pbcopy` を追加してクリップボード自動コピーにする（小改善）
- スキル追加は現状不要と判断（CLAUDE.md カスタムコマンド方式で十分）

## 将来の改善案（実装保留）
- **検索ログの蓄積** - ユーザーの検索入力を記録して分析に活用
- **埋め込みに食材情報を含める** - タイトル+食材でより精度の高いセマンティック検索

## ブロッカー・注意点
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
9903f96 Merge pull request #9 from mktu/feature/fix-flex-footer
376662f fix: 全件表示時は「一覧をアプリで見る」ボタンを非表示にする
ac99cd4 Merge pull request #8 from mktu/feature/line-recipe-list
68f08b2 feat: LINE検索結果をカルーセルから縦リスト型Flex Messageに変更
fb52651 docs: update SESSION.md for session handoff
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像
- `supabase/config.toml` - Edge Functions の verify_jwt 設定
- `docs/backlogs/README.md` - エピック一覧（お気に入り・探す改善）
- `src/lib/line/flex-message.ts` - LINE Flex Message 生成ロジック
- `scripts/preview-flex.ts` - Flex Message プレビュー用スクリプト
