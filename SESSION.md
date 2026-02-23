# セッション引き継ぎ

## 最終更新
2026-02-24 (cooking_time_minutes 実装・マージ完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **一般公開準備完了**

## 直近の完了タスク
- [x] **cooking_time_minutes 実装（PR #10 マージ済み）**
  - DB: `recipes` テーブルに `cooking_time_minutes INTEGER` カラム追加
  - JSON-LD: ISO 8601 パーサー（PT1H30M→90分）で `cookTime`→`totalTime` の順に取得
  - `__NEXT_DATA__`（Nadia）: `cookTime` フィールドを取得
  - Gemini フォールバック: スキーマ・プロンプトに調理時間抽出ルールを追加
- [x] **バックログ整理（探す体験 + データ準備）**
  - `search-ux.md`: ボトムシート→クイックリプライに方針転換、Quick Reply 選択肢を4つに確定（お気に入り/よく作る/材料少なめ/時短）
  - `cook-count.md` / `cooking-time.md`: バックログ新規作成

## 進行中のタスク
（なし）

## 次にやること（優先度順）
- [ ] **本番環境のSupabaseプロジェクト作成**
  - **東京リージョン（Northeast Asia - Tokyo）で作成すること**
- [ ] **本番環境の埋め込みバッチ処理セットアップ**
  - `docs/EMBEDDING_BATCH_SETUP.md` に沿って設定
- [ ] **OGP画像の作成**（1200×630px）
- [ ] **エピック実装（詳細は `docs/backlogs/README.md` 参照）**
  - 探す体験の改善 - クイックリプライ（search-ux.md）
  - お気に入り（favorites.md）
  - よく作る - 調理回数カウント（cook-count.md）
  - ~~調理時間データ取得（cooking-time.md）~~ ← **完了**

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
9f4f3c6 Merge pull request #10 from mktu/feature/add-cooking-time
89350c5 feat: recipes テーブルに cooking_time_minutes カラムを追加
b1222fc docs: update SESSION.md for session handoff
74b1289 docs: バックログ整理 - 探す体験をクイックリプライ方針に更新
4a1fcc4 docs: update SESSION.md for session handoff
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像
- `supabase/config.toml` - Edge Functions の verify_jwt 設定
- `docs/backlogs/README.md` - エピック一覧
- `docs/backlogs/search-ux.md` - 探す体験（クイックリプライ）方針
- `docs/backlogs/favorites.md` - お気に入りバックログ
- `docs/backlogs/cook-count.md` - よく作る（調理回数）バックログ
- `docs/backlogs/cooking-time.md` - 調理時間データ取得バックログ
- `src/lib/line/flex-message.ts` - LINE Flex Message 生成ロジック
- `scripts/preview-flex.ts` - Flex Message プレビュー用スクリプト
