# セッション引き継ぎ

## 最終更新
2026-05-06 (Issue #47 Jina Reader + Gemini フォールバック廃止完了、PR #50 マージ済み)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 直近の完了タスク
- [x] **#47: Jina Reader + Gemini フォールバック廃止**（PR #50、マージ済み）
  - `parseWithJinaGemini()` とインポートを削除
  - `src/lib/llm/` ディレクトリごと削除（gemini-client.ts, extract-recipe.ts, recipe-schema.ts）
  - `src/lib/scraper/jina-reader.ts` 削除
  - `scripts/test-jina-extract.ts` 削除
  - プライバシーポリシーの Gemini 説明を修正、Vercel Analytics 追記
  - `docs/ARCHITECTURE.md` から Jina Reader 関連の記述を削除・更新

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

## 参照すべきファイル
- `CLAUDE.md` - プロジェクトガイド
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ブランチ戦略
- `src/lib/recipe/parse-recipe.ts` - レシピ解析フロー（#47 で簡素化済み）
- `src/components/features/legal/privacy-content.tsx` - プライバシーポリシー（#47 で更新済み）

## コミット履歴（直近）
```
00b24f9 fix: Jina Reader + Gemini フォールバックを廃止し法的リスクを解消 (Issue #47) (#50)
af52b40 docs: update SESSION.md for session handoff
d03e704 feat: 法的リスクチェックのスキル (/legal-check) を追加
ab3dc7d docs: ARCHITECTURE.md と DATABASE_DESIGN.md の実装との乖離を修正
e0b394b docs: update SESSION.md for session handoff
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app
