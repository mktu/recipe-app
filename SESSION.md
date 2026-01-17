# セッション引き継ぎ

## 最終更新
2025-01-17 (ホーム画面実装・UI改善完了)

## 現在のフェーズ
フェーズ 1：Web/LIFF 基盤と DB 連携

## 直近の完了タスク
- [x] プロジェクトセットアップ（Next.js, Tailwind, shadcn/ui）
- [x] Supabase 設定（ローカル開発環境、マイグレーション）
- [x] 認証レイヤー実装（DevAuthProvider / LIFFAuthProvider）
- [x] ユーザー登録 API 実装（/api/auth/ensure-user）
- [x] **ホーム画面実装**
  - レシピ一覧（リスト形式・1列）
  - 検索バー（300msデバウンス）
  - 食材フィルター（ボトムシート、ANDロジック）
  - ソート（4種類）
  - FABボタン、空状態表示
- [x] **UI改善**
  - レイアウト中央揃え（mx-auto max-w-2xl）
  - 食材フィルターシートのパディング修正
  - useTransitionでローディングちらつき防止

## 進行中のタスク
なし

## 次にやること
- [ ] レシピ追加画面の実装（/recipes/add）
- [ ] レシピ詳細画面の実装（/recipes/[id]）

## ブロッカー・注意点
- ローカル開発時は `supabase start` で起動が必要
- Docker が必要（約 2GB のディスク使用）

## ホーム画面ファイル構成

```
src/
├── types/recipe.ts                           # 型定義
├── lib/db/queries/
│   ├── recipes.ts                            # レシピクエリ
│   └── ingredients.ts                        # 食材クエリ
├── hooks/
│   ├── use-recipes.ts                        # レシピ取得（useTransition使用）
│   ├── use-ingredients.ts                    # 食材取得
│   └── use-recipe-filters.ts                 # フィルター状態管理
├── components/features/home/
│   ├── home-page.tsx                         # メイン
│   ├── recipe-list.tsx                       # リスト
│   ├── recipe-card.tsx                       # カード
│   ├── search-bar.tsx                        # 検索
│   ├── sort-select.tsx                       # ソート
│   ├── ingredient-filter.tsx                 # フィルター
│   ├── ingredient-category-list.tsx          # カテゴリ別食材
│   ├── selected-ingredients.tsx              # 選択中チップ
│   ├── empty-state.tsx                       # 空状態
│   └── add-recipe-fab.tsx                    # FAB
└── components/ui/ (shadcn)
    ├── sheet.tsx
    ├── select.tsx
    └── skeleton.tsx
```

## 技術的なポイント

### useTransition によるローディング改善
```typescript
const [isPending, startTransition] = useTransition()

// 状態更新をトランジションでラップ
startTransition(() => {
  setRecipes(data)
})
```
- `isLoading`: 初回ロード時のみtrue（スケルトン表示）
- `isPending`: リフェッチ中（前のデータを維持）

## コミット履歴（直近）
```
a751339 Use useTransition to prevent loading flicker on refetch
24e8cc1 Add consistent padding to ingredient filter sheet content
8a09d8b Fix layout centering for home screen
a185aa5 Add home screen with recipe list, search, and ingredient filter
a535a51 Add authentication layer with DevAuth and LIFF providers
```

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `src/lib/auth/` - 認証レイヤー
- `src/lib/db/` - Supabase クライアント・クエリ
- `src/hooks/` - カスタムフック
- `src/components/features/home/` - ホーム画面コンポーネント
