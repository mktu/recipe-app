# セッション引き継ぎ

## 最終更新
2026-02-12 (埋め込みバッチ処理の実装・ステージング環境セットアップ完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **Bot検索機能完了・埋め込みバッチ処理完了**

## 直近の完了タスク
- [x] **埋め込みバッチ処理への移行**
  - レシピ作成時の即時埋め込み生成を廃止
  - pg_cron + Edge Function で5分毎にバッチ処理
  - リトライ制限（3回まで）を追加
  - GitHub Actions で Edge Function 自動デプロイ
  - ステージング環境のセットアップ完了
- [x] **本番環境セットアップ手順書作成**
  - `docs/EMBEDDING_BATCH_SETUP.md` に手順を文書化
- [x] **ベクトル検索機能の実装**
  - pgvector 拡張と embedding カラム追加（3072次元）
  - Google gemini-embedding-001 を使用（無料枠: 1000 RPD）
  - ハイブリッド検索: ILIKE で3件未満の場合、ベクトル検索で補完
  - 類似度閾値: 0.65（精度調整済み）

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
- [ ] リッチメニュー画像の本番デザイン作成

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
f04a32d docs: add embedding batch setup guide for production
db1dd93 Merge pull request #5 from mktu/feature/batch-embedding-generation
577290a feat: batch embedding generation with pg_cron and Edge Function
2b529a1 Merge pull request #4 from mktu/feature/add-vector-search
9ed5f3d feat: add vector search for recipe titles
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `docs/EMBEDDING_BATCH_SETUP.md` - 本番環境の埋め込みバッチ処理セットアップ手順
- `supabase/functions/generate-embeddings/index.ts` - 埋め込み生成 Edge Function
- `src/lib/embedding/` - 埋め込み生成クライアント
- `src/lib/db/queries/recipe-embedding.ts` - ベクトル検索クエリ
- `scripts/backfill-embeddings.ts` - バックフィルスクリプト
