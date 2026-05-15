# セッション引き継ぎ

## 最終更新
2026-05-15 (ドキュメント整合性チェック・修正完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 直近の完了タスク
- [x] **#43: OGP 画像の作成**
  - `public/og-image.jpg` を追加
  - `src/app/layout.tsx` に `metadataBase`（`NEXT_PUBLIC_APP_URL` 使用）と `openGraph.images` を設定
  - `src/app/(public)/lp/page.tsx` の `openGraph` にも `images` を追加
  - `public/logo.png` を追加し、ホーム画面ヘッダーのロゴをテキストから画像（175×58）に変更
  - develop に直接プッシュ済み・Issue #43 クローズ済み
- [x] **#44: Security Headers の追加**
  - `next.config.ts` に各種ヘッダー追加・develop にマージ済み
- [x] **#49: オンボーディング一括登録で食材リンクとサイト名が登録されない問題を修正**
  - develop にマージ済み
- [x] **#48: 画像ホットリンク対応をペンディング判断**
  - 現在の利用規模では実害なしと判断・Issue にコメント済み
- [x] **ドキュメント整合性チェック（/doc-check-logic + /doc-check-structure）**
  - `docs/ARCHITECTURE.md` 食材名寄せフローチャートを実装に合わせ更新（調味料除外・部分一致検索追記、インメモリ検索の明示）
  - `docs/ARCHITECTURE.md` システム構成図に `onboarding-scrape` Edge Function を追加
  - `docs/DATABASE_DESIGN.md` マッチングフローに調味料チェックステップを追加
  - `docs/DATABASE_DESIGN.md` アンマッチ時の挙動を「直接作成」→「unmatched_ingredients キューイング → auto-alias バッチ処理」に修正

## 進行中のタスク
なし

## 次にやること（GitHub Issues で管理）
- [ ] **develop → main PR を作成して本番リリース**（#44, #49, #43 の変更を本番反映）
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
- **#48 画像ホットリンク:** 利用規模が数百人規模になったら `next/image` + ワイルドカード許可を再検討

## 参照すべきファイル
- `CLAUDE.md` - プロジェクトガイド
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・ブランチ戦略（本セッションで更新）
- `docs/DATABASE_DESIGN.md` - DB設計（RPC関数一覧含む）（本セッションで更新）
- `next.config.ts` - Security Headers 設定（#44 で追加）
- `public/og-image.jpg` - OGP 画像（#43 で追加）
- `public/logo.png` - ロゴ画像（#43 で追加）
- `src/app/layout.tsx` - metadataBase + openGraph 設定（#43 で更新）
- `src/components/features/home/home-client.tsx` - ヘッダーロゴ画像（#43 で更新）
- `src/lib/recipe/match-ingredients.ts` - 食材マッチング（一括フェッチ＋インメモリ化済み）
- `src/lib/recipe/link-ingredients.ts` - 一括食材リンク処理（#49 で追加）
- `src/app/api/onboarding/complete/route.ts` - オンボーディング完了API（after()で非同期リンク）
- `supabase/functions/onboarding-scrape/index.ts` - スクレイピング Edge Function（source_name抽出追加）

## コミット履歴（直近）
```
d4f042d docs: ドキュメントと実装の乖離を修正
54e74a0 docs: update SESSION.md for session handoff
0a953d2 feat: OGP 画像の追加とロゴ画像の更新 (Issue #43)
e3c4f73 feat: add official plugins (security-guidance, frontend-design, supabase)
9ab9fdc docs: end-sessionスキルにブランチ確認ステップを追加
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app
