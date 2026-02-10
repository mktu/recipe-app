# セッション引き継ぎ

## 最終更新
2026-02-10 (ベクトル検索機能追加・ステージングバックフィル完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **Bot検索機能完了・ベクトル検索追加**

## 直近の完了タスク
- [x] **ベクトル検索機能の実装**
  - pgvector 拡張と embedding カラム追加（3072次元）
  - Google gemini-embedding-001 を使用（無料枠: 1000 RPD）
  - ハイブリッド検索: ILIKE で3件未満の場合、ベクトル検索で補完
  - 類似度閾値: 0.65（精度調整済み）
  - レシピ作成時に埋め込みを自動生成
- [x] **バックフィルスクリプト作成**
  - `scripts/backfill-embeddings.ts` - 既存レシピの埋め込み生成
  - `--env=staging` オプションでステージング環境に対応
- [x] **ステージング環境のバックフィル実行**
  - 5件のレシピの埋め込み生成完了

## 進行中のタスク
なし

## 次にやること（優先度順）
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
- **ベクトル検索の制限:**
  - pgvector インデックス（IVFFlat/HNSW）は 2000 次元が上限
  - 3072 次元のため、インデックスなしで運用（数千件規模では問題なし）
- **バックフィル実行:** 新環境では `npx tsx scripts/backfill-embeddings.ts --env=staging` を実行
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
2b529a1 Merge pull request #4 from mktu/feature/add-vector-search
9ed5f3d feat: add vector search for recipe titles
f8a0cce docs: update SESSION.md for session handoff
f9de978 refactor: replace "AI" with "自動" in LP copy
cc82112 feat: add privacy policy and terms of service pages
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `src/lib/embedding/` - 埋め込み生成クライアント
- `src/lib/db/queries/recipe-embedding.ts` - ベクトル検索クエリ
- `supabase/migrations/20260209000000_add_vector_search.sql` - pgvector マイグレーション
- `scripts/backfill-embeddings.ts` - バックフィルスクリプト
- `.env.staging` - ステージング環境変数（要設定）
