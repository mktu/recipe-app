# オンボーディング UX バグ修正

## ステータス
🚧 進行中（Issue 1 修正済み・Issue 2 未着手）

## 背景

本番リリース前の動作確認で、オンボーディングフローに致命的な UX 上の問題が 2 件見つかった。
リリース前に修正必須。

---

## Issue 1: オンボーディングがループする

### 再現手順

1. 新規ユーザーとして LIFF を開く → オンボーディング画面が表示される
2. 食材を選択して「収集スタート」を押す
3. バックグラウンドでスクレイピングが実行され、LINE に候補レシピの通知が届く
4. LINE の通知をタップして LIFF を開く
5. **→ オンボーディングの最初の画面に戻ってしまう（ループ）**

### 期待される動作

- 通知タップ後は `/onboarding/result`（レシピ候補選択画面）に遷移する

### 原因仮説

- `onboarding_completed_at` が「収集スタート」時点でセットされていないため、
  LIFF 再オープン時のリダイレクトロジックがオンボーディングに飛ばしている
- または LINE 通知の LIFF URL が `/onboarding/result` を指定しているが、
  middleware / layout のリダイレクト条件が先に発火して上書きしている

### 調査ポイント

- `src/app/(protected)/layout.tsx` または middleware のリダイレクト条件
- `supabase/functions/onboarding-scrape/index.ts` の LINE 通知 URL
- `POST /api/onboarding/start` のレスポンス後に `onboarding_completed_at` をセットしているか

### 対応方針（案）

- 「収集スタート」ボタン押下時（`/api/onboarding/start`）に `onboarding_completed_at` をセットする
  - ただし「スクレイピングが失敗したとき再試行できなくなる」リスクがあるため、
    別フラグ（例: `onboarding_started_at`）を使う方が安全かもしれない
- あるいは middleware で `/onboarding/result` へのアクセスはリダイレクト対象外にする

---

## Issue 2: オンボーディングの食材入力体験が悪い

### 問題の詳細

#### 問題 A: 自由入力に見えるが候補選択が必要

- 入力欄が一見テキストボックスのように見えるが、実際には候補（サジェスト）から選択しなければ食材タグが追加されない
- ユーザーが文字を入力して Enter を押しても何も起きない → 離脱の原因

#### 問題 B: 完全一致しないと候補が出ない

- 例: 「鶏」と入力しても「鶏肉」が候補に出てこない
- 「その食材はないのか」とユーザーに誤解させてしまう
- 前方一致・部分一致での候補表示が必要

### 期待される動作

- 部分一致（前方一致）でサジェストが表示される
- 候補がない場合でも「そのまま追加」できる（自由入力のフォールバック）

### 調査ポイント

- `src/components/features/onboarding/` 内の食材入力コンポーネント
- shadcn/ui の `Command` コンポーネントのフィルタリングロジック
- 食材マスタ（DB）の検索方式（クライアント側フィルタ or API 検索）

### 対応方針（案）

**A. 部分一致サジェストの実装:**
- `Command` コンポーネントの `filter` prop をカスタマイズして部分一致に変更
- または `cmdk` の `shouldFilter={false}` + 独自フィルタ関数を実装

**B. 自由入力フォールバック:**
- 候補に一致しない入力でも Enter / 「追加」ボタンで任意文字列をタグ追加できるようにする
- その場合、食材マスタとの紐付けは曖昧検索（embedding 類似検索）で対応するか、
  「登録済み食材に含まれない」として別扱いにする

---

## 優先度

| Issue | 重篤度 | 理由 |
|-------|--------|------|
| Issue 1: ループ | 🔴 Critical | オンボーディングが完了できない → DAU に直撃 |
| Issue 2: 入力 UX | 🟠 High | 食材を登録できない → オンボーディングの価値がゼロになる |

## 影響ファイル（調査後に確定）

- `src/app/(protected)/layout.tsx` または `middleware.ts` — リダイレクト条件
- `src/app/api/onboarding/start/route.ts` — 収集開始時の状態管理
- `supabase/functions/onboarding-scrape/index.ts` — LINE 通知 URL
- `src/components/features/onboarding/` — 食材入力コンポーネント
