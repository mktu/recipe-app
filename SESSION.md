# セッション引き継ぎ

## 最終更新
2026-06-15 (/doc-check-logic で ARCHITECTURE.md 認証フローを検証・整合化、未使用 ensure-user API を削除して develop に直接プッシュ)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 直近の完了タスク
- [x] **/doc-check-logic でアーキテクチャ整合性を検証し認証フローを修正（commit 896f853→develop直接push済み）**
  - 検証範囲: 認証 / レシピ解析 / 食材名寄せの3セクション（git diff main...HEAD から自動推論）
  - レシピ解析フロー: ARCHITECTURE.md と一致（JSON-LD→__NEXT_DATA__→空結果）。※CLAUDE.md L17 の「Jina Reader」記述のみ実装と乖離（実装は __NEXT_DATA__）→ 未対応
  - 食材名寄せフロー: 完全一致（マッチ順序・インメモリ検索・auto-alias 202非同期・max100ループ）
  - 認証フロー差異①修正: ユーザー登録は follow だけでなく URL送信・検索時にも `ensureUser()` で遅延登録される旨を追記
  - 認証フロー差異②修正: `/api/auth/ensure-user` route を削除。a535a51（認証レイヤー導入）で作られたが**導入時から一度もクライアントから呼ばれていないデッドコード**と git 履歴で確認。実登録は Webhook 側 `ensureUser()` が担当
  - lint / build パス確認済み
- [x] **#101 アクセス制御の修正（IDOR）を ID トークン検証で実装（PR #107→develop反映済み）**
  - 課題: API が `lineUserId` を body/ヘッダから無検証で受け取り、Service Role キーで RLS をバイパス（他人のレシピを読み書きできる IDOR リスク）
  - 方針: LINE **ID トークン**（LIFF `getIDToken()`）をサーバーで検証し、検証済み userId のみ使用
  - サーバー基盤: `src/lib/auth/verify-line-token.ts`（LINE verify エンドポイント・dev バイパス）、`src/lib/api/auth-guard.ts`（`requireLineUser()`）
  - 全ユーザー操作 API で検証済み userId に統一（list/parse/[id]/create/ensure-user/delete-user/track POST）
  - 対象外: webhook（LINE 署名検証済み）、track GET（redirect のみ・ユーザーデータ非依存）
  - クライアント: adapter/context に `getIdToken` 追加、`useAuthedFetch` フックで `Authorization: Bearer` 自動付与、無効化された `x-line-user-id` ヘッダ除去
  - ドキュメント: `docs/ARCHITECTURE.md` の API構成・認証フローに ID トークン検証を追記
  - RLS の本格適用は defense-in-depth として優先度中〜低 → Issue #110 に分離（現状は API 層で防御充足）
  - API コール集約リファクタ（typed 関数レイヤー）は Issue #106 に分離
- [x] **/legal-check（法的リスクチェック）を実施し、要対応3件を Issue 化**
  - #100: 利用規約 第6条と実装の不一致（robots.txt/解析禁止判定が未実装）→ **対応済み**
  - #101: アクセス制御 - API が lineUserId を無検証で受け取り RLS がバイパス（IDOR リスク・高）→ 未着手
  - #102: プライバシーポリシーの Gemini 学習利用記述が API プランと整合するか要確認（中）→ 未着手
  - 良好だった点: スクレイピングは構造化メタデータのみ（本文非取得）、LINE 退会/削除フローは整合
- [x] **#100 利用規約 第6条を解析の実態に合わせて修正（PR #103→develop反映済み）**
  - 落とし所は案B（文言修正）を採用。robots.txt 実装追加（案A）は単発取得のため過剰と判断
  - 保証できない約束（「利用規約により禁止されたコンテンツは解析しない」）を削除
  - 実態を明記: 構造化メタデータのみ取得・本文非複製・robots.txt 等の指定を尊重
- [x] **#97 プライバシーポリシー・利用規約を実装に合わせて更新（PR #98→develop反映済み）**
  - 第5条: アカウント削除案内を「設定画面から削除できます」に変更
  - 第4条: Gemini API の用途に食材名エイリアス自動生成を追記
  - 第4条: Gemini API 送信データはGoogleのモデル学習に使用されない旨を追記
  - 利用規約に外部サービスの利用規約遵守条項（第6条）を新設、以降の条番号を繰り上げ
- [x] **#86 ユーザーが自己でアカウント削除できる機能を実装（PR #95→develop反映済み）**
  - `DELETE /api/auth/delete-user` エンドポイント追加
  - LINE deauthorize API 呼び出し（チャンネルアクセストークン + userAccessToken）
  - `/settings` ページ + アカウント削除ダイアログ実装
  - ホームヘッダーに設定アイコン追加
  - `AuthProviderAdapter` に `getAccessToken()` を追加
  - unfollow イベントでの DB 削除は廃止（ブロック ≠ データ削除意思）
  - 退会キーワード（「退会」等）で設定画面への誘導メッセージを追加
  - NEXT_PUBLIC_LIFF_ID からチャンネル ID を抽出、LINE_LOGIN_CHANNEL_SECRET を新規追加
- [x] **`/create-pr` スキルを追加**（--base develop 強制、ベースブランチをユーザーに確認）
- [x] **#80 #81 #82 プライバシーポリシーを実態に合わせて修正（PR #93）**
- [x] **#78 User-AgentをBot識別可能な値に変更（PR #91）**

## 進行中のタスク
なし

## 次にやること（GitHub Issues で管理）
- [ ] **CLAUDE.md L17 の Scraper 記述を実装に合わせて修正**（「Jina Reader API（フォールバック）」→ 実装は `__NEXT_DATA__` 抽出。/doc-check-logic で発見、ARCHITECTURE.md 側は整合済み）
- [ ] **#102 Gemini API プランの確認**
  - 使用キーが課金プラン有効か確認 → 無料枠ならプライバシーポリシー記述を修正 or 有料化
- [ ] **develop → main PR を作成して本番リリース**（#86 アカウント削除 + #97/#100 法的文書更新を本番反映）
  - Vercel 本番環境に `LINE_LOGIN_CHANNEL_SECRET` の設定が必要
- [ ] **Vercel Dashboard で Node.js バージョンを 24.x に設定**（手動作業）
  - Settings → Build & Development Settings → Node.js Version → 24.x
- [ ] **パッケージアップデートの継続**（スキップした項目）
  - `@supabase/supabase-js`: 2.106.0（patch）
  - `@types/node`: 24 → 25（major、影響調査が必要）
  - G3: AI SDK（`ai` 6.0.48→6.0.184、`@ai-sdk/google` 3.0.13→3.0.75）
  - G4: UI / スタイリング（`lucide-react` major あり要注意）
  - G6: 開発ツール（`typescript` 5→6、`eslint` 9→10、`lint-staged` 16→17 など major 多数）
  - G7: その他（`swr`、`zod`、`schema-dts` 1→2 major）
- [ ] **#37〜#39: E2E テスト**
- [ ] **#106 API コールを lib/api の typed 関数レイヤーに集約（リファクタ・保守性）**
  - パス直書き・`res.ok` エラー定型の重複を解消。`useApiXxx` ではなく素の関数 + `request()` ヘルパー
- [ ] **#110 RLS の実効化（defense-in-depth・優先度中〜低）**
  - 現状 `auth.uid()` ベースのポリシーは Supabase Auth 不在で空振り。先に単一データアクセス層・クロスユーザーテストが費用対効果高

## ブロッカー・注意点
- **本番リリース前に Vercel 本番環境へ `LINE_LOGIN_CHANNEL_SECRET` を設定すること**
  - LINE Developers Console → LINE Login チャンネル → Basic settings → Channel secret
- **PR は必ず `--base develop` を指定する**（`/create-pr` スキルを使うと安全）
  - 過去に `main` へ誤マージした実績あり（PR #95）
- **Vercel Preview の Deployment Protection は Off にしている**
  - staging の LINE Webhook を通すために必要
- **staging LINE チャネルの Webhook URL**
  - `https://recipe-app-git-develop-mktus-projects.vercel.app/api/webhook/line`
- **ローカル開発でのレシピ取得:** `supabase functions serve` を別ターミナルで起動する必要あり
- **ローカルではアカウント削除不可**（DevAuthProvider は getAccessToken が null を返すため）
- **ローカルでレシピ追加するには `dev-user-001` の users 行が必要**（`supabase/seed.sql`）。無いと create が「ユーザーが見つかりません」で失敗 → `npx supabase db reset` で seed 再投入
- **API は ID トークン検証必須**（dev モードは `NEXT_PUBLIC_LIFF_ID` 空でバイパス）。クライアントからの API 呼び出しは `useAuthedFetch` を使う
- **Supabase キー:**
  - `SUPABASE_SECRET_KEY`（`sb_secret_...` 形式）を全体で統一使用
  - Edge Functions 内部は `SUPABASE_SERVICE_ROLE_KEY`（Supabase 自動インジェクト）を使用
- **fnm の PATH:** ターミナル起動時に `eval "$(fnm env --use-on-cd --shell zsh)"` が必要

## 参照すべきファイル
- `CLAUDE.md` - プロジェクトガイド
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・API構成
- `docs/DATABASE_DESIGN.md` - DB設計
- `src/components/features/legal/privacy-content.tsx` - プライバシーポリシー
- `src/components/features/legal/terms-content.tsx` - 利用規約
- `src/lib/auth/verify-line-token.ts` - ID トークン検証（dev バイパス）
- `src/lib/api/auth-guard.ts` - `requireLineUser()`（API 認証ガード）
- `src/hooks/use-authed-fetch.ts` - `useAuthedFetch`（Authorization ヘッダ自動付与）
- `src/app/api/auth/delete-user/route.ts` - アカウント削除API
- `src/components/features/settings/account-delete-section.tsx` - 削除UI
- `src/lib/auth/types.ts` - AuthProviderAdapter（getAccessToken / getIdToken）
- `.claude/skills/create-pr/SKILL.md` - PR作成スキル

## コミット履歴（直近）
```
896f853 docs: 認証フローの記述を実装と整合させ、未使用の ensure-user API を削除
c489abd docs: update SESSION.md and ARCHITECTURE.md for session handoff
2835285 Merge pull request #107 from mktu/feature/fix-idor-line-token-101
f9e2be5 fix: API の lineUserId を ID トークンで検証し IDOR を防ぐ (Issue #101)
7084e73 docs: update SESSION.md for session handoff
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app
