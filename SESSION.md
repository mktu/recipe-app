# セッション引き継ぎ

## 最終更新
2026-03-06 (よく見る一覧カードに調理時間・材料数を表示)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **一般公開準備完了**

## 直近の完了タスク
- [x] **よく見る一覧カードに調理時間・材料数を表示**
  - `fetchMostViewedForBot` で `cooking_time_minutes` / `ingredients_raw` を取得
  - `handleYokuTsukuru` のカードマッピングに `cookingTimeMinutes` / `ingredientCount` を追加
  - 時短・材料少なめカードと同じ表示スタイルに統一
- [x] **LINEカードに調理時間・材料数を常時表示**（前セッション）
  - バブルカード：`⏱ X分　🍴 X品` を1行で追加（値なしは `-`）
  - 縦リスト：`材料 X品` → `🍴 X品` に変更、常時表示（値なしは `-`）

## 進行中のタスク
（なし）

## 次にやること（優先度順）
- [ ] **LINE 実機確認**（時短カード・材料少なめカードの「さらに見る →」動作確認）
- [ ] **本番環境の Supabase プロジェクト作成**
  - **東京リージョン（Northeast Asia - Tokyo）で作成すること**
- [ ] **本番環境の埋め込みバッチ処理セットアップ**
  - `docs/EMBEDDING_BATCH_SETUP.md` に沿って設定
- [ ] **OGP 画像の作成**（1200×630px）

## 保留エピック
- お気に入り（favorites.md）- 「よく見る」と役割が被るため保留

## 検討事項（次回以降）
- `preview:flex` に `| pbcopy` を追加してクリップボード自動コピーにする（小改善）

## 将来の改善案（実装保留）
- **検索ログの蓄積** - ユーザーの検索入力を記録して分析に活用
- **埋め込みに食材情報を含める** - タイトル+食材でより精度の高いセマンティック検索
- **ingredients_raw の amount を正しくパース** - 現状は name に量も含む文字列で amount は空。JSON-LD の recipeIngredient から量と名前を分離する改善

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
49e7585 fix: よく見る一覧カードに調理時間と材料数を表示
8cbc03a docs: バックログ README のLIFF絞り込みエピックを完了に更新
b06cf7d Merge pull request #16 from mktu/feature/fix-line-card-cross-fields
5ef3df5 fix: LINEカードの時短・材料少なめで両フィールドを表示し横並びに変更
1ea5e5e docs: update SESSION.md for session handoff
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロダクト要件（ユースケース・機能要件）
- `CLAUDE.md` - 開発ルール・コマンド・スキル
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ディレクトリ構造
- `docs/backlogs/README.md` - エピック一覧
- `src/lib/line/search-recipes.ts` - Bot用レシピ取得クエリ（よく見る・時短・材料少なめ等）
- `src/lib/line/category-handler.ts` - カテゴリ選択ハンドラー（よく見る・時短・材料少なめ）
- `src/lib/line/flex-message.ts` - Flex Message 生成（リストUI）
- `src/components/features/home/recipe-card.tsx` - レシピカード（調理時間・材料数表示）
- `src/types/recipe.ts` - SortOrder 型定義
- `src/hooks/use-recipe-filters.ts` - フィルター状態管理（InitialFilters）
- `src/app/(protected)/page.tsx` - ?sort= クエリパラメータ受け取り
- `supabase/functions/get-recipes/index.ts` - レシピ一覧取得 Edge Function
