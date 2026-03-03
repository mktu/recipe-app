# LINE カテゴリカードから LIFF 絞り込みページへの誘導

## ステータス
✅ 完了（2026-03-03）

## 背景・課題

LINE の「時短」「材料少なめ」カテゴリカードは上位 5 件しか表示されない。
「さらに見たい」ユーザーのために LIFF へ誘導したいが、現状では：

- Flex Message のフッター「一覧をアプリで見る」ボタンが常時非表示
  （`hasMore = recipes.length < totalCount` が常に false）
- LIFF トップに飛ばしても絞り込みが解除されており体験が途切れる

## 方針

カテゴリカードのフッターに「さらに表示」ボタンを追加し、
そのカテゴリに対応した絞り込み済みの LIFF ページへ遷移させる。

```
LINE カード（時短 5件）
  └─「さらに表示」→ https://liff.line.me/{id}?sort=shortest_cooking
                          ↓
                  LIFF: 調理時間が短い順にソートされたレシピ一覧
```

## 実装内容

### ① LINE カードのフッターボタン表示条件

RPC が返した件数 = 上限（5件）のときのみ「さらに表示」を表示する。
5件未満の場合は全件表示済みのためボタン不要。

```
cards.length >= 5 → フッターボタン表示（もっとある可能性あり）
cards.length < 5  → フッターボタン非表示（全件収まっている）
```

`createVerticalListMessage` の呼び出し時に `totalCount = cards.length + 1`（cards.length が 5 のとき）を渡すか、
`forceShowFooter` オプションをカテゴリハンドラー側で制御する。

### ② フロントエンド: ?sort= クエリパラメータ対応

`src/app/(protected)/page.tsx` の `searchParams` に `sort` を追加。

```typescript
// 現状
initialFilters = { searchQuery, ingredientIds }

// 変更後
initialFilters = { searchQuery, ingredientIds, sortOrder }
```

### ③ SortOrder に新オプション追加

```typescript
type SortOrder = 'newest' | 'oldest' | 'most_viewed' | 'recently_viewed'
  | 'shortest_cooking'    // ← 追加: 調理時間が短い順
  | 'fewest_ingredients'  // ← 追加: 材料が少ない順
```

ソート選択 UI（`sort-select.tsx`）にも追加。

### ④ API / Edge Function でのソート対応

`/api/recipes/list` および Edge Function で新 sortOrder に対応するクエリを追加。

| sortOrder | SQL |
|---|---|
| `shortest_cooking` | `ORDER BY cooking_time_minutes ASC NULLS LAST` |
| `fewest_ingredients` | `ORDER BY jsonb_array_length(ingredients_raw) ASC` |

### ⑤ LINE カテゴリハンドラーで URL に ?sort= を付与

| カテゴリ | LIFF URL |
|---|---|
| 時短 | `?sort=shortest_cooking` |
| 材料少なめ | `?sort=fewest_ingredients` |
| よく見る | `?sort=most_viewed`（既存ソートを流用） |
| 最近見た | `?sort=recently_viewed`（既存ソートを流用） |

## 影響ファイル（予定）

- `src/lib/line/flex-message.ts` — フッター表示条件
- `src/lib/line/category-handler.ts` — LIFF URL 生成
- `src/app/(protected)/page.tsx` — sort クエリパラメータ受け取り
- `src/hooks/use-recipe-filters.ts` — 初期 sortOrder 対応
- `src/components/features/home/sort-select.tsx` — UI に新オプション追加
- `src/app/api/recipes/list/route.ts` — 新 sortOrder を Edge Function に渡す
- `supabase/functions/` — Edge Function のソートクエリ追加
- 必要に応じて `npm run functions:build`

## 考慮事項

- LIFF deep link で `?sort=` が正しく渡されるか確認が必要
- `shortest_cooking` / `fewest_ingredients` でソートした場合、NULL レコードは末尾に
- 既存の `most_viewed` / `recently_viewed` は URL パラメータ経由でも動作するか確認
