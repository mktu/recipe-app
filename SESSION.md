# セッション引き継ぎ

## 最終更新
2026-02-09 (LP・利用規約・プライバシーポリシーページ作成)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **Bot検索機能完了・LP作成完了**

## 直近の完了タスク
- [x] **LPページ作成（/lp）**
  - ヒーローセクション（スマホモックアップ、食材イラスト付き）
  - 3ステップ紹介（URL送信 → 自動タグ付け → 食材検索）
  - スクリーンショットセクション（プレースホルダー）
  - FAQセクション（アコーディオン）
  - CTAセクション（LINE友だち追加ボタン）
- [x] **利用規約・プライバシーポリシーページ作成**
  - `/terms` - 利用規約
  - `/privacy` - プライバシーポリシー
  - LPフッターにリンク追加
- [x] **LP改善**
  - 「無料で使えます」→ チェックマークリスト（✓完全無料 ✓登録かんたん ✓広告なし）
  - 「AI」→「自動」に表現変更（実態に合わせて）
- [x] **リッチメニュー設定変更（手動）** - 完了済み

## 進行中のタスク
なし

## 次にやること（優先度順）
- [ ] **LP用スクリーンショット画像の用意**
  - レシピ一覧画面（750×1334px）
  - 食材検索画面（750×1334px）
- [ ] **OGP画像の作成**（1200×630px）
- [ ] **LINE友だち追加URL設定**
  - 環境変数 `NEXT_PUBLIC_LINE_FRIEND_URL` に設定
- [ ] **さらなるマッチング改善（任意）**
  - 表記ゆれ対応: ニラ→にら、レンコン→れんこん
  - 食材マスター追加: 長芋、小ねぎ、ローズマリー、ミント など
- [ ] リッチメニュー画像の本番デザイン作成

## 将来の改善案（実装保留）
- **検索ログの蓄積** - ユーザーの検索入力を記録して分析に活用
  - 詳細は `/Users/uemuramakoto/.claude/plans/distributed-frolicking-quasar.md` 参照

## ブロッカー・注意点
- **ローカル開発:** `.env.local` の `NEXT_PUBLIC_LIFF_ID` を空にするとLINEログインなしで動作
- ローカル開発時は `supabase start` で起動が必要
- **RLS注意:** Webhookでは `createServerClient`（Secret Key）を使用すること
- **Gemini API無料枠:** `gemini-2.5-flash` を使用（20 requests/day程度）
- **DB型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行
- **GitHub Secrets:** `SUPABASE_ACCESS_TOKEN` と `SUPABASE_PROJECT_REF` が必要（CI用）
- **マイグレーション順序:** 食材マスター → エイリアスの順で適用される（タイムスタンプで制御）
- **ブランチ運用:** `feature/*` → PR → main マージの流れ
- **Botテスト:** `npm run test:bot "メッセージ"` でローカルテスト可能

## コミット履歴（直近）
```
f9de978 refactor: replace "AI" with "自動" in LP copy
cc82112 feat: add privacy policy and terms of service pages
1a13a33 feat: add landing page (/lp)
d2744de docs: update SESSION.md for session handoff
47f5f2f docs: add LINE Bot test script usage to README
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `src/app/lp/page.tsx` - LPページ
- `src/components/features/lp/` - LPコンポーネント群
- `src/app/privacy/page.tsx` - プライバシーポリシー
- `src/app/terms/page.tsx` - 利用規約
- `src/components/features/legal/` - 法的ページコンポーネント
