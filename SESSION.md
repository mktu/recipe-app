# セッション引き継ぎ

## 最終更新
2026-02-18 (アーキテクチャドキュメント作成)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **一般公開準備完了**

## 直近の完了タスク
- [x] **アーキテクチャドキュメント作成**
  - `docs/ARCHITECTURE.md` を新規作成
  - システム構成、認証フロー、レシピ解析フロー、CI/CD等を図解
- [x] **auto-alias Edge Functionの本番デプロイ**
  - PRマージ後、CIでデプロイ完了
  - JWT検証OFF設定完了
  - pg_cronジョブ設定完了（1日1回呼び出し）
- [x] **食材エイリアス自動生成機能（ADR-001）**
  - 未マッチ食材をLLMで判定し、エイリアス登録または新規食材追加
  - バッチ処理（1日1回、最大100件）
  - 非同期パターンでpg_cronの5秒タイムアウトを回避
- [x] **Edge Function共有ロジックのリファクタリング**
  - `src/lib/batch/` にソースコードを配置（Node.js用）
  - ビルドスクリプトでDeno用に変換してコピー
  - ESLint警告を解消（max-lines, complexity）
- [x] **CI/CD対応**
  - PR時に `functions:build` を実行してビルド検証
  - マージ後に Edge Function をデプロイ
  - 生成ファイルは `.gitignore` で除外
- [x] **ドキュメント整備**
  - `docs/EDGE_FUNCTIONS.md` を作成
  - `docs/ADR-001-ingredient-matching.md` を作成

## 進行中のタスク
なし

## 次にやること（優先度順）
- [ ] **本番環境のSupabaseプロジェクト作成**
  - **東京リージョン（Northeast Asia - Tokyo）で作成すること**
- [ ] **本番環境の埋め込みバッチ処理セットアップ**
  - `docs/EMBEDDING_BATCH_SETUP.md` に沿って設定
- [ ] **LP用スクリーンショット画像の用意**
- [ ] **OGP画像の作成**（1200×630px）

## 将来の改善案（実装保留）
- **検索ログの蓄積** - ユーザーの検索入力を記録して分析に活用
- **埋め込みに食材情報を含める** - タイトル+食材でより精度の高いセマンティック検索

## ブロッカー・注意点
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
dd5560c docs: add Edge Functions development guide
98ddaf9 chore: gitignore generated Edge Function files, build in CI
69955f6 refactor: split alias-generator into smaller modules for lint compliance
448447b refactor: share alias-generator logic between Node.js and Edge Function
abf2f35 refactor: use fetch-based Gemini API and async pattern for Edge Function
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `docs/ADR-001-ingredient-matching.md` - 食材マッチング表記揺れ対応のADR
- `docs/EDGE_FUNCTIONS.md` - Edge Functions開発ガイド
- `src/lib/batch/alias-generator.ts` - エイリアス自動生成メイン処理
- `src/lib/batch/alias-db.ts` - エイリアス自動生成DB操作
- `src/lib/batch/alias-llm.ts` - エイリアス自動生成LLM操作
- `scripts/auto-alias.ts` - ローカル実行用スクリプト
- `scripts/build-edge-functions.ts` - Edge Functionビルドスクリプト
- `supabase/functions/auto-alias/index.ts` - Edge Functionエントリーポイント
