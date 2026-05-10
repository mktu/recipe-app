# セッション引き継ぎ

## 最終更新
2026-05-10 (食材フィルタ UI 刷新完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 直近の完了タスク
- [x] **#52: レシピサイトごとの絞り込み機能** (PR #53 マージ済み)
- [x] 食材フィルタ UI 刷新
  - アコーディオン → カテゴリタブ＋チップ選択 UI に変更（オンボーディングと統一）
  - Sheet open 時の自動フォーカス無効化（キーボードが即出ない）
  - ひらがな/カタカナ混在検索に対応（「おくら」→「オクラ」ヒット）

## 進行中のタスク
なし

## 次にやること（GitHub Issues で管理）
- [ ] **#48: 画像ホットリンクを next/image プロキシに置き換え**（優先度: 中）
- [ ] **#42: API エラーレスポンスの汎用化**
- [ ] **#43: OGP 画像の作成**
- [ ] **#44: Security Headers の追加**
- [ ] **#45: Vercel Analytics / Speed Insights の導入**
- [ ] **#37〜#39: E2E テスト**

## ブロッカー・注意点
- **Vercel Preview の Deployment Protection は Off にしている**
  - staging の LINE Webhook を通すために必要
  - develop ブランチの Preview URL が公開状態になっている
- **staging LINE チャネルの Webhook URL**
  - `https://recipe-app-git-develop-mktus-projects.vercel.app/api/webhook/line`
  - ngrok でローカルテストする際は一時的にこの URL を ngrok URL に変更し、テスト後に戻す
- **ローカル開発でのレシピ取得:** `supabase functions serve` を別ターミナルで起動する必要あり
- **Supabase キー:**
  - `SUPABASE_SECRET_KEY`（`sb_secret_...` 形式）を全体で統一使用
  - Edge Functions 内部は `SUPABASE_SERVICE_ROLE_KEY`（Supabase 自動インジェクト）を使用
- **ローカル DB リセット後の注意:** `supabase db reset` で seed が適用されるが全データ消去される
- **ローカル開発:** `.env.local` の `NEXT_PUBLIC_LIFF_ID` を空にすると LINE ログインなしで動作
- **DB 型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行
- **Embedding（タイトルのみ Gemini 送信）は低リスク** — Jina+Gemini フォールバック廃止後も embedding は引き続き使用
- **ソースフィルタの null 扱い:** `source_name` が null のレシピは `_other` センチネル値で「その他」として表示

## 参照すべきファイル
- `CLAUDE.md` - プロジェクトガイド
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ブランチ戦略
- `docs/DATABASE_DESIGN.md` - DB設計（RPC関数一覧含む）
- `src/components/features/home/ingredient-filter.tsx` - 食材フィルタ Sheet
- `src/components/features/home/ingredient-filter-content.tsx` - タブ＋チップ UI
- `src/hooks/use-ingredient-filter.ts` - フィルタ状態管理（ひらがな/カタカナ正規化含む）
- `supabase/functions/get-recipes/index.ts` - レシピ一覧取得 Edge Function（ソースフィルタ実装済み）

## コミット履歴（直近）
```
8e69d4a fix: Sheet open時の自動フォーカス無効化 & ひらがな/カタカナ混在検索に対応
228886b feat: 食材フィルタをカテゴリタブ+チップ選択 UI に変更
21ffef9 fix: キーボード表示時に食材フィルタのボトムシートが隠れる問題を修正
86e40af Merge pull request #53 from mktu/feature/add-source-site-filter
925b3bb feat: レシピサイトごとの絞り込み機能を追加 (Issue #52)
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app
