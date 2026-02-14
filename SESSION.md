# セッション引き継ぎ

## 最終更新
2026-02-14 (リッチメニュー画像適用・レイアウト変更完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **Bot検索機能完了・埋め込みバッチ処理完了**

## 直近の完了タスク
- [x] **リッチメニュー画像の適用とレイアウト変更**
  - `public/rich-menu.png` を作成（2500x1686px）
  - レイアウトを 2x2 から 1段目全幅 + 2段目3分割 に変更
  - LINE Official Account Manager で設定
  - `docs/LINE_SETUP.md` を更新

## 進行中のタスク
なし

## 次にやること（優先度順）
- [ ] **本番環境の埋め込みバッチ処理セットアップ**
  - `docs/EMBEDDING_BATCH_SETUP.md` に沿って設定
- [ ] **LP用スクリーンショット画像の用意**
  - レシピ一覧画面（750×1334px）
  - 食材検索画面（750×1334px）
- [ ] **OGP画像の作成**（1200×630px）
- [ ] **LINE友だち追加URL設定**
  - 環境変数 `NEXT_PUBLIC_LINE_FRIEND_URL` に設定
- [ ] **さらなるマッチング改善（任意）**
  - 食材マスター追加: 長芋、小ねぎ、ローズマリー、ミント など

## 将来の改善案（実装保留）
- **検索ログの蓄積** - ユーザーの検索入力を記録して分析に活用
  - 詳細は `/Users/uemuramakoto/.claude/plans/distributed-frolicking-quasar.md` 参照

## ブロッカー・注意点
- **埋め込みバッチ処理:**
  - レシピ登録時は `title_embedding = NULL` で保存される
  - 5分毎に Edge Function が埋め込みを生成
  - JWT 検証は Supabase ダッシュボードから手動で無効化（CLI の既知問題）
- **ローカル埋め込み生成:**
  - `npm run backfill:embeddings` でローカル DB の埋め込みを生成
  - `npm run test:recipe:with-embeddings` でレシピ登録と埋め込み生成をセット実行
- **ベクトル検索の制限:**
  - pgvector インデックス（IVFFlat/HNSW）は 2000 次元が上限
  - 3072 次元のため、インデックスなしで運用（数千件規模では問題なし）
- **ローカル開発:** `.env.local` の `NEXT_PUBLIC_LIFF_ID` を空にするとLINEログインなしで動作
- ローカル開発時は `supabase start` で起動が必要
- **RLS注意:** Webhookでは `createServerClient`（Secret Key）を使用すること
- **Gemini API無料枠:**
  - `gemini-2.5-flash` を使用（20 requests/day程度）
  - `gemini-embedding-001` は 1000 RPD
- **DB型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行
- **GitHub Secrets:** `SUPABASE_ACCESS_TOKEN` と `SUPABASE_PROJECT_REF` が必要（CI用）
- **マイグレーション順序:** 食材マスター → エイリアスの順で適用される（タイムスタンプで制御）
- **ブランチ運用:** `feature/*` → PR → main マージの流れ
- **Botテスト:** `npm run test:bot "メッセージ"` でローカルテスト可能

## コミット履歴（直近）
```
7e12b25 docs: update SESSION.md for session handoff
f04a32d docs: add embedding batch setup guide for production
62d7f7a fix: move config.toml to correct location with proper format
831df41 fix: disable JWT verification for generate-embeddings function
db1dd93 Merge pull request #5 from mktu/feature/batch-embedding-generation
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `docs/LINE_SETUP.md` - LINE開発環境構成・リッチメニュー設定
- `public/rich-menu.png` - リッチメニュー画像（2500x1686px）
- `docs/EMBEDDING_BATCH_SETUP.md` - 本番環境の埋め込みバッチ処理セットアップ手順
