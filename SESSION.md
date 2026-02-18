# セッション引き継ぎ

## 最終更新
2026-02-19 (LP hero画像の置き換え)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **一般公開準備完了**

## 直近の完了タスク
- [x] **LP hero画像の置き換え**
  - `public/hero-mockup.png` を追加
  - `hero-section.tsx` のPhoneMockupをコード描画から画像に変更
  - 不要な `Frame 1.svg` を削除

## 進行中のタスク
- [ ] **LP「シンプルで使いやすい」セクションの画像用意**
  - LINEトーク画面（URL送信）と解析結果確認画面の2枚構成を予定
  - ユーザーがスクリーンショットを用意中

## 次にやること（優先度順）
- [ ] **LP「シンプルで使いやすい」セクションの画像追加**
  - `screenshot-section.tsx` を更新
- [ ] **本番環境のSupabaseプロジェクト作成**
  - **東京リージョン（Northeast Asia - Tokyo）で作成すること**
- [ ] **本番環境の埋め込みバッチ処理セットアップ**
  - `docs/EMBEDDING_BATCH_SETUP.md` に沿って設定
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
d476582 feat: replace LP hero mockup with actual screenshot
1bceb9a docs: update SESSION.md for session handoff
da698c4 docs: add architecture documentation
7924111 Merge pull request #7 from mktu/feature/auto-alias-ingredients
fb1fec2 docs: update SESSION.md for session handoff
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像
- `src/components/features/lp/hero-section.tsx` - LP hero セクション
- `src/components/features/lp/screenshot-section.tsx` - LP スクリーンショットセクション（次回更新予定）
