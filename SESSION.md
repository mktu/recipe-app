# セッション引き継ぎ

## 最終更新
2026-01-28 (正規化ロジック改善 - 精度重視アプローチ)

## 現在のフェーズ
フェーズ 2：AI パース (Jina Reader + Gemini) - 完了

## 直近の完了タスク
- [x] **正規化ロジックの改善（精度重視）**
  - ブランド名除去パターン追加（20種: キッコーマン、ミツカン等）
  - 孤立した数字の除去（「大さじ」除去後の残り数字）
  - スペースなしの「数字+単位」のみ除去に変更
  - 玉/株/房を単位リストから除外（食材名の一部になりうる）
  - 技術的決定を `requirements.md` に文書化
- [x] **レシピカードの食材タグUI修正**
- [x] **食材データ取得のサーバーコンポーネント化（全画面）**
- [x] **折りたたみ式カテゴリ選択の追加**
- [x] **Supabase型リファクタリング**
- [x] **食材フィルターUI改善**（検索 + 履歴）

## 進行中のタスク
なし

## 次にやること（優先度順）

### 食材マッチング改善
- [ ] **マッチしない場合の新規作成を制限**
  - `match-ingredients.ts` の Step 4 を修正
  - マッチしない場合は `ingredients` に追加せずスキップ
- [ ] **未マッチ食材の記録テーブル追加**
  - `unmatched_ingredients` テーブルを作成
  - マッチしなかった食材名を記録（ヒット率計測用）
  - 後からエイリアス登録やLLMフォールバック導入の判断材料に

### 将来の改善（必要に応じて）
- [ ] LLMフォールバック（ルールベースでマッチしない場合、ヒット率を見て判断）

## ブロッカー・注意点
- ローカル開発時は `supabase start` で起動が必要
- Docker が必要（約 2GB のディスク使用）
- 外部画像URLは next/image ではなく通常の img タグを使用
- 認証はLIFF SDKベースでクライアントサイド取得
- **Gemini API無料枠:** `gemini-2.5-flash` を使用（20 requests/day程度）
- **JSON-LD対応サイト:** delishkitchen等はJSON-LDで高速解析可能
- **DB型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行
- **食材マスター（ingredients）:** RLSは `USING (true)` で認証不要、サーバーコンポーネントで取得可能

## アーキテクチャ（ホーム画面）

```
app/page.tsx (Server Component)
  ├─ await fetchIngredientsByCategory()  ← サーバーで取得
  ├─ revalidate = 3600 (1時間キャッシュ)
  └─ <HomeClient ingredientCategories={...} />

components/features/home/home-client.tsx (Client Component)
  ├─ useAuth() - 認証チェック
  ├─ useRecipeFilters() - フィルター状態管理
  └─ <IngredientFilter categories={...} />
       └─ <IngredientFilterContent />
            ├─ 検索入力
            ├─ 最近使った食材（履歴）
            └─ CategoryAccordionSection（折りたたみ式カテゴリ）
```

## コミット履歴（直近）
```
7f144c6 Improve ingredient normalization with precision-focused approach
1235f3f Fix: truncate long ingredient names in recipe card
ed743d0 Refactor: remove useIngredients hook and server-side fetch for all screens
c3fc716 Add collapsible category selection and server-side ingredient fetching
c67529d Refactor: regenerate Supabase types and remove any assertions
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `src/app/page.tsx` - ホーム画面（サーバーコンポーネント）
- `src/components/features/home/home-client.tsx` - ホーム画面クライアント
- `src/components/features/home/category-accordion-section.tsx` - カテゴリ折りたたみ
- `src/hooks/use-ingredient-filter.ts` - 食材フィルターロジック
