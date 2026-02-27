# 探す体験の改善（LINE チャット内クイックリプライ）

## ステータス
✅ 完了（PR #11）

## 背景・課題

現在リッチメニューの「探す」から食材検索のみができる。
レシピが増えると探し方も多様になるため（お気に入り、よく作る、フリーワードなど）、複数の探し方を統一した入り口から提供したい。

## 方針

**LINE チャット内で完結させる。LIFF は開かない。**

「探す」タップで Quick Reply でカテゴリを選ばせる。リッチメニューの変更は不要。

```
リッチメニュー「探す」タップ（テキスト送信）
    ↓
Bot が Quick Reply でカテゴリを提示
[⭐ お気に入り] [🔁 よく作る] [📦 材料少なめ] [⏱ 時短]
    ↓
カテゴリ選択 → 対応する結果を Flex Message で返す
```

食材名・レシピ名はそのままテキスト入力でも検索できます（既存の検索フローに流す）。

## 実装内容

### 実装ファイル

- `src/lib/line/category-handler.ts` — カテゴリ選択 Quick Reply とカテゴリ別ハンドラ
- `src/lib/line/url-handler.ts` — URL処理ロジック（route.ts から分離）
- `supabase/migrations/20260227000000_search_category_rpcs.sql` — DB関数追加

### 各カテゴリの実装

| カテゴリ | 実装 | 備考 |
|---------|------|------|
| ⭐ お気に入り | 「近日公開予定」メッセージ | favorites epic で実装予定 |
| 🔁 よく作る | `view_count` 上位（既存） | cook-count.md の方針変更に伴い view_count を使用 |
| 📦 材料少なめ | `ingredients_raw` 配列長 ASC（RPC） | 元レシピの食材数に近い値 |
| ⏱ 時短 | `cooking_time_minutes` ASC（RPC） | NULL除外 |

## 関連エピック

- [お気に入り](./favorites.md) - ⭐ お気に入り選択肢の実装（未着手）
- [よく作る（調理回数カウント）](./cook-count.md) - ✅ 完了（view_count で代替）
- [調理時間データ取得](./cooking-time.md) - ✅ 完了
