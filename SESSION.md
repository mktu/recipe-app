# セッション引き継ぎ

## 最終更新
2026-05-06 (法的リスク調査 & Issue #47, #48 作成)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 直近の完了タスク
- [x] **法的リスク調査**: スクレイピング・著作権・プライバシー・LINE規約を包括的にチェック
  - 主要レシピサイト8件の robots.txt を調査
  - Gemini フォールバックが最大リスクと特定
  - LINE 規約は大きな問題なしと確認
- [x] **#47 作成**: Jina Reader + Gemini フォールバック廃止 + プライバシーポリシー更新
- [x] **#48 作成**: 画像ホットリンクを next/image プロキシに置き換え
- [x] **`/legal-check` スキル作成**: アーキテクチャ・DB起点の法的リスクチェックをスキル化

## 進行中のタスク
なし

## 次にやること（GitHub Issues で管理）
- [ ] **#47: Gemini フォールバック廃止 + プライバシーポリシー更新**（優先度: 高）
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
- **法的リスク調査メモ:**
  - Nadia・クックパッドは robots.txt で AI ボット（ClaudeBot, GPTBot）を明確にブロック
  - User-Agent 変更は Gemini 廃止後は優先度低（現状維持で OK）
  - Embedding（タイトルのみ Gemini 送信）は低リスク

## 参照すべきファイル
- `CLAUDE.md` - プロジェクトガイド
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ブランチ戦略
- `src/lib/recipe/parse-recipe.ts` - レシピ解析フロー（#47 の主な変更対象）
- `src/lib/scraper/jina-reader.ts` - #47 で削除予定
- `src/lib/llm/extract-recipe.ts` - #47 で削除予定
- `src/components/features/legal/privacy-content.tsx` - #47 でプライバシーポリシー更新
- `.claude/skills/legal-check/skill.md` - 法的リスクチェックスキル

## コミット履歴（直近）
```
d03e704 feat: 法的リスクチェックのスキル (/legal-check) を追加
ab3dc7d docs: ARCHITECTURE.md と DATABASE_DESIGN.md の実装との乖離を修正
e0b394b docs: update SESSION.md for session handoff
206da55 fix: テストコマンドを開発環境のみに制限し、クライアントサイドの console.log を削除 (Issue #40, #41)
496b4b4 docs: update SESSION.md for session handoff
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app
