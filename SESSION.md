# セッション引き継ぎ

## 最終更新
2026-07-08 (/legal-check スキルを収束型に改善（判断記録の Issue 一元化）・PR #138 develop マージ済み)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 直近の完了タスク
- [x] **/legal-check スキルを収束型に改善（PR #138→develop反映済み・merged 2026-07-08）**
  - 課題: /legal-check 実行のたびに新規指摘が湧き（#78〜#86 → #97〜#102 → #118〜#134 の3波）、修正 → 再指摘のループが収束しない。原因は ①「対応しない」という判断がどこにも記録されず次回再指摘される ②対応要否の線引きが未定義 ③レポートの「要対応」テーブルが空だと失敗に見えるため埋めるための指摘が生まれる、の3点と診断
  - **判断記録を GitHub Issues に一元化**（register ファイル案・差分スキャン案も検討したが、二重管理の維持コストと複雑化を理由に不採用）:
    - 受容済みリスク = `legal-accepted` ラベルの **closed Issue**（1リスク=1 Issue。本文に受容理由と再検討の条件）。再検討条件に該当しない限り再指摘禁止。同種の裁定はカテゴリ単位で既存 Issue にコメント追記し、Issue を無駄に増やさない
    - 実施記録 = `legal-check-run` ラベルの Issue（1実行=1 Issue。open のまま = 未裁定の指摘あり）。新規指摘ゼロでも作成して即 close（実施記録として残す）
  - **対応要否の線引きを明文化**: 要対応にできるのは「法令義務違反が具体的に説明できる」「公表ポリシーと実装の矛盾」「規約違反で停止・ブロックの現実的リスク」の3条件のみ。ベストプラクティス・条件付きリスク（営利化したら〜）・実害経路が説明できない理論上のリスクは受容。**迷ったら受容に倒して要確認へ**。「新規指摘ゼロは失敗ではなく収束」を前提に明記
  - 過去の受容判断3件を記録用 Issue に移行済み: #135（対象サイト規約の営利目的利用禁止・非営利のため受容）、#136（Kurashiru の営利目的 AI 入力禁止・営利化時に再検討）、#137（UA・文言等の体裁改善・カテゴリ受容）
  - スキャン手順（全体像 → DB スキーマ → 外部連携 → 法的ページ）は従来どおり毎回フルスキャン。robots.txt・対象サイト規約のみ SCRAPING_POLICY.md の確認時点から6ヶ月経過時に WebFetch 再確認
- [x] **利用規約・プライバシーポリシーへの同意導線を追加（PR #134→develop反映済み・merged 2026-07-06）**
  - `/legal-check`（今回実施）で発見: 利用規約 第2条は「LINE ログインをもって利用登録完了＝契約成立」と定めるが、**登録完了時点（友だち追加 / LIFF ログイン）で規約が一度も提示されておらず、同意の意思表示の導線が欠けていた**。規約ページ自体は掲出済みだが拘束力が弱い状態
  - 調査した現状導線: ①LP は `LPFooter` にリンクがあるのみ（CTA ボタン近傍に同意文言なし）②友だち追加時のウェルカムメッセージに言及なし ③初回 LIFF 起動時に同意ゲートなし。**QR・LINE 検索・共有リンク経由など LP を経由しない登録があるため LP だけでは全ユーザーをカバーできない**
  - 対応①（最重要）: `src/app/api/webhook/line/route.ts` の follow イベントのウェルカムメッセージに、利用規約・プライバシーポリシーの URL と同意文言を2通目のテキストとして追記（全登録経路が必ず通過する）。URL は `NEXT_PUBLIC_APP_URL` + `/terms`・`/privacy` で組立
  - 対応②: `src/components/features/lp/cta-section.tsx` の「LINEで友だち追加」ボタン直下に「友だち追加により利用規約・プライバシーポリシーに同意したものとみなします」＋リンクを配置（LP 経由の事前補強）
  - **注意: staging/本番で `NEXT_PUBLIC_APP_URL` が設定されていること**を要確認（未設定だと LINE トーク上でリンクが機能しない）
  - lint / build パス確認済み
  - `/legal-check` の他の指摘（公開ブロッカーでない）: Gemini 有料 tier 切替は非営利維持なら公開後でよい（Issue #132 で追跡）、データ保持期間の明確化は推奨止まり、画像直リンク・Cookpad ToS「解析」文言は運用で吸収
- [x] **#110 RLS ポリシーを実アーキテクチャに沿って整理・明示化（PR #126→develop→main反映済み・merged 2026-07-03）**
  - `/legal-check` の要対応「RLS 未実効」への対応。全面的な per-user RLS（Supabase Auth 導入=option a）ではなく、**Issue #110 推奨の費用対効果の高い路線**（空振りポリシー整理・意図明示・回帰テスト）を採用
  - 調査で判明: LINE 認証で Supabase Auth ユーザー不在のため init の `auth.uid()` ベースポリシーは**誰にもマッチしない空振り（dead code）**。per-user 認可に見えて実は機能していなかった。ブラウザ(anon)が触るのは公開マスター `ingredients` のみ、ユーザーデータは全て service_role でサーバー経由
  - 新マイグレーション `20260702000000_clarify_rls_policies.sql`: `users`/`recipes`/`recipe_ingredients` は空振りポリシー撤去→`service_role` フルアクセスのみ（anon は既定拒否）。`ingredients`/`ingredient_aliases` は公開 SELECT 維持+service_role 書込。service_role は BYPASSRLS のため**実行時挙動は不変**（意図明示と dead code 排除が目的）
  - デッドコード削除: ブラウザ露出 anon で `recipes` を引く `src/lib/db/queries/recipe-search.ts`（+re-export）。呼び出しは全て `/api/recipes/list`→Edge Function `get-recipes`(service_role) 経由で未使用と確認
  - 回帰テスト: `test-migrations.yml` に anon がユーザーデータを読めないことを検証するステップ追加。**環境差の学び**: ローカル/Cloud は blanket GRANT ありで RLS 層(0件)拒否、CI はクリーンで GRANT 層(permission denied)拒否 → 両方を「拒否＝合格」として扱う。公開マスターは実行時読取(GRANT依存)でなく public SELECT ポリシー存在で検証
  - `docs/ARCHITECTURE.md` の RLS 記述を実態に更新
  - **スコープ外（将来）:** Supabase Auth 導入による真の per-user DB 分離(option a)は Issue でも「今すぐ必須でない」→ ブラウザから Supabase を直接叩く設計に変える場合に再検討
  - lint / test(24) / build / ローカル RLS 挙動検証・CI 全パス
- [x] **/legal-check（法的リスクチェック）を実施（2026-07-03）**
  - 著作権面（本文非保存・画像URL参照）とアカウント削除フロー（deauthorize+CASCADE）は堅実、外部4サービスもポリシー記載済みで良好
  - 要対応: ①RLS 未実効（#110→上記で対応済み）②プライバシーポリシーの収集項目取りこぼし（→下記 PR #124 で対応済み）
  - 要確認（人間判断）: Gemini API ティアと学習利用の整合（#102 で開示済み）、運営者匿名表示の是非
- [x] **プライバシーポリシーの収集情報にレシピメタデータ・閲覧履歴を追記（PR #124→develop反映済み・merged 2026-07-01）**
  - `/legal-check` で発見: 実装で保存している「レシピのメタデータ（タイトル/サイト名/画像URL/調理時間）」と「閲覧履歴（view_count/last_viewed_at）」が `privacy-content.tsx` の「1. 収集する情報」に未記載
  - 虚偽ではなく不足のため軽微だが実態と一致させる修正。lint パス確認済み
- [x] **#111 README を RecipeHub 用に整備（PR #116→develop反映済み・merged 2026-06-16）**
  - 課題: README が `create-next-app` デフォルトのまま（36行）。アプリ公開・技術記事化（#109）に向けて概要が伝わる README に刷新
  - 概要・ビジョン・主な機能・技術スタック・セットアップ・ドキュメント導線・法的事項を記載
  - **ビジョン文言を見直し**: 「献立の意思決定コストをゼロにする」は大言壮語的なため LP トーンに合わせ「**献立選びをもっとラクに**」へ変更。README/CLAUDE.md/requirements.md/docs/ARCHITECTURE.md の**4ファイル横断で統一**
  - **「AI が自動でタグ付け」の表記を実態へ修正**: レシピ登録のタグ付けは AI 不使用。実態は構造化データ抽出（JSON-LD → __NEXT_DATA__ → OGP）＋ルールベースの食材マッチング（`parse-recipe.ts` / `match-ingredients.ts`）。AI(Gemini)はセマンティック検索の埋め込み生成・食材名寄せ辞書の生成にのみ利用。README と LP メタ description（`src/app/(public)/lp/page.tsx`）を修正
  - **requirements.md 冒頭に乖離注記を追加**: 構想時は AI 解析を想定 → **法的リスクで AI 解析は不採用**に方針転換した経緯と、実装の正本は `docs/ARCHITECTURE.md` である旨を明記
  - **重複の解消**: README の環境変数の全ブロック（CLAUDE.md と重複）とディレクトリ構成の詳細ツリー（ARCHITECTURE.md と重複）を削除し、各正本へのリンク＋要約に置換。技術スタック表は GitHub トップの概観用として残置
  - lint パス確認済み
- [x] **#102 プライバシーポリシーの Gemini 学習利用記述を実態に合わせて修正（PR #115→develop反映済み・merged 2026-06-16）**
  - 課題: 第4条に「送信データはGoogleのモデル学習には使用されません」と記載していたが、Gemini Developer API を**無料プラン**で利用しており規約上は学習利用され得るため、記述が事実と異なっていた（ユーザー確認済み）
  - 落とし所は対応案(b)（文言修正）を採用。有料プラン移行(a)は、送信データがレシピタイトル・食材名のみで機微性が低いため現時点では過剰と判断
  - `src/components/features/legal/privacy-content.tsx` 第4条を「送信データはGoogleの利用規約に基づき、サービスの提供・改善およびAIモデルの学習に利用される場合があります（詳細はGoogleのプライバシーポリシーをご確認ください）」へ変更
  - `alias-llm.ts`/`embedding/` 等のコード側に同種の文言は無し（文言は privacy-content.tsx のみ）
  - **将来有料プランへ移行する場合は記述を見直すこと**（学習に使われない旨を再度明記できる）
  - lint パス確認済み
- [x] **#105 JSON-LD/__NEXT_DATA__ 失敗時に OGP からタイトルを取得（PR #113→develop反映済み・merged 2026-06-16）**
  - 課題: 構造化データを持たないサイトで title が空になり「タイトル未取得」で保存されていた（`url-handler.ts:51`）
  - 解決: 解析の最終フォールバックに **Strategy 3: OGP 抽出** を追加（JSON-LD → __NEXT_DATA__ → OGP → 空結果）
  - `src/lib/scraper/ogp-extractor.ts`（新規）: `og:title`/`og:image`/`og:site_name` を抽出。`og:title` 無しは `<title>` タグ、`og:site_name` 無しはドメイン名にフォールバック。`content` の前後位置両対応・HTMLエンティティデコード
  - OGP でタイトルが取れた場合は食材空（手動入力）の `ParsedRecipe` を返す
  - `ogp-extractor.test.ts`（新規）: 8 ケースのユニットテスト追加（全パス）
  - `docs/ARCHITECTURE.md`: 解析フロー図・ディレクトリ説明・API 表を更新
  - **スコープ外（必要なら別Issue化）:** JSON-LD に Recipe はあるが recipeIngredient が空のケースの補完
  - lint / build / test パス確認済み
- [x] **PR #112 を develop→main マージし本番を最新化（merged 2026-06-15）**
  - 内容: docs 整合（ARCHITECTURE.md / SESSION.md）・未使用 ensure-user API 削除を本番反映
  - PR #108（#86 アカウント削除 + #97/#100 法的文書 + #101 IDOR 修正）に続くドキュメント追従リリース
  - develop と main は完全に同期済み（差分なし）
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
- [ ] **次回 /legal-check 実行時に新運用の動作を確認**（受容済み #135〜#137 と open Issue（#132, #48, #110）が再指摘されないこと、実施 Issue が作成されること）
- [ ] **CLAUDE.md L17 の Scraper 記述を実装に合わせて修正**（「Jina Reader API（フォールバック）」→ 実装は `__NEXT_DATA__` 抽出。/doc-check-logic で発見、ARCHITECTURE.md 側は整合済み）
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

## ブロッカー・注意点
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
- `src/lib/recipe/parse-recipe.ts` - レシピ解析フロー（JSON-LD → __NEXT_DATA__ → OGP → 空結果）
- `src/lib/scraper/ogp-extractor.ts` - OGP 抽出（タイトルフォールバック）
- `src/components/features/legal/privacy-content.tsx` - プライバシーポリシー
- `src/components/features/legal/terms-content.tsx` - 利用規約
- `supabase/migrations/20260702000000_clarify_rls_policies.sql` - RLS ポリシー（service_role ベース・設計意図をコメント記載）
- `.github/workflows/test-migrations.yml` - マイグレーションテスト（RLS backstop 回帰テスト含む）
- `src/lib/auth/verify-line-token.ts` - ID トークン検証（dev バイパス）
- `src/lib/api/auth-guard.ts` - `requireLineUser()`（API 認証ガード）
- `src/hooks/use-authed-fetch.ts` - `useAuthedFetch`（Authorization ヘッダ自動付与）
- `src/app/api/auth/delete-user/route.ts` - アカウント削除API
- `src/components/features/settings/account-delete-section.tsx` - 削除UI
- `src/lib/auth/types.ts` - AuthProviderAdapter（getAccessToken / getIdToken）
- `.claude/skills/create-pr/SKILL.md` - PR作成スキル
- `.claude/skills/legal-check/skill.md` - 法的リスクチェックスキル（Issue 一元化・線引き基準）
- `docs/SCRAPING_POLICY.md` - スクレイピング方針（robots.txt・対象サイト規約の確認記録の正本）

## コミット履歴（直近）
```
139ee71 Merge pull request #138 from mktu/feature/refactor-legal-check-skill
0a848be refactor: /legal-check を収束型に改善（判断記録の Issue 一元化と対応要否の線引き）
5197400 docs: update SESSION.md for session handoff
4c20bb4 Merge pull request #134 from mktu/feature/add-terms-consent-flow
3a2355d feat: 利用規約・プライバシーポリシーへの同意導線を追加
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app
