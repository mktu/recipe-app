# セッション引き継ぎ

## 最終更新
2025-01-21 (レシピ詳細画面実装完了)

## 現在のフェーズ
フェーズ 1：Web/LIFF 基盤と DB 連携

## 直近の完了タスク
- [x] **レシピ詳細画面実装**
  - 詳細表示（/recipes/[id]）
  - メモのインライン編集
  - 削除機能（確認ダイアログ付き）
  - 閲覧数記録
  - SWR導入でキャッシュ管理（戻る時のちらつき解消）
- [x] **レシピ追加画面実装**
  - URL入力画面（/recipes/add）
  - 確認・編集画面（/recipes/add/confirm）
  - AI解析スタブAPI（後でJina Reader + Geminiに置換）

## 進行中のタスク
なし

## 次にやること
- [ ] AI解析の本実装（Jina Reader + Gemini）
- [ ] 全項目編集機能（将来対応として保留中）

## ブロッカー・注意点
- ローカル開発時は `supabase start` で起動が必要
- Docker が必要（約 2GB のディスク使用）
- 外部画像URLは next/image ではなく通常の img タグを使用
- 認証はLIFF SDKベースでクライアントサイド取得（サーバーコンポーネントでの直接データ取得は不可）

## レシピ詳細画面ファイル構成

```
src/
├── app/
│   ├── api/recipes/[id]/
│   │   └── route.ts                       # GET/PATCH/DELETE
│   └── recipes/[id]/
│       ├── page.tsx                       # 詳細ページ
│       ├── loading.tsx                    # ローディングUI
│       └── not-found.tsx                  # 404ページ
├── lib/db/queries/
│   ├── recipes.ts                         # 一覧・作成クエリ
│   └── recipe-detail.ts                   # 詳細・削除・更新クエリ
├── hooks/
│   └── use-recipes.ts                     # SWRでレシピ一覧取得
└── components/features/recipe-detail/
    ├── recipe-detail-page.tsx             # メインコンポーネント
    ├── recipe-detail-wrapper.tsx          # データ取得ラッパー
    ├── recipe-header.tsx                  # 画像・タイトル・食材
    ├── recipe-ingredients.tsx             # 材料リスト
    ├── recipe-memo.tsx                    # メモ（インライン編集）
    ├── memo-display.tsx                   # メモ表示
    ├── memo-editor.tsx                    # メモ編集フォーム
    ├── recipe-actions.tsx                 # 削除・外部リンク
    └── use-recipe-actions.ts              # API呼び出しhook
```

## 技術的なポイント

### SWRによるキャッシュ管理
```typescript
// use-recipes.ts
const { data, error, isLoading } = useSWR(swrKey, fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 300,
})
```
- ページ遷移後もキャッシュが効く
- stale-while-revalidate パターンで最新データを取得

### 認証情報の受け渡し
```typescript
// クライアントからAPIへヘッダーで送信
fetch(`/api/recipes/${id}`, {
  headers: { 'x-line-user-id': user.lineUserId },
})
```

## コミット履歴（直近）
```
c9ed3db Improve memo UI with inline editing
7b0701e Add recipe detail page with SWR for data fetching
c09d819 Update SESSION.md for handoff
617cb45 Add loading.tsx for streaming SSR on confirm page
```

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `src/lib/auth/` - 認証レイヤー
- `src/lib/db/queries/` - Supabase クエリ
- `src/components/features/recipe-detail/` - 詳細画面コンポーネント
- `src/hooks/use-recipes.ts` - SWRによるレシピ取得
