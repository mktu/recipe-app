# オンボーディングチャット - 初回レシピ一括登録

## ステータス
📋 未着手

## 背景・課題

新規ユーザーがアプリを使い始める際、レシピが 0 件の状態からスタートする必要があり、
1件ずつ URL を登録する手間が大きな参入障壁になっている。

- DELISH KITCHEN / Nadia などのお気に入りページはログイン必須で外部からアクセス不可
- URL を手動でコピーして貼り付ける体験は手間が多い
- 「空のアプリ」から価値を感じるまでのハードルが高い

## 方針

新規ユーザーの初回アクセス時に、AI チャットで好みをヒアリングし、
バックグラウンドでレシピを収集。完了したら LINE で通知する。

```
初回アクセス
  ↓
チャット画面（LIFF）
  AI: 「嫌いな食材はありますか？」
  AI: 「調理時間の希望は？」
  AI: 「よく使うレシピサイトはどこですか？」
  ↓
「収集スタート」ボタン
  ↓
「バックグラウンドで探しています。完了したら LINE で通知します！」
（ユーザーは他のことをしていい）
  ↓
裏でスクレイピング（〜2分）
  ↓
LINE 通知「5件のレシピが見つかりました！確認してください」
  ↓
LIFF でレシピ候補を確認 → 追加 / スキップ
  ↓
選んだレシピを一括登録、一時データを破棄してホーム画面へ
```

### 法的考慮

- **ユーザー起点の収集**（ボタン操作）であり自動バッチではない
- **少量**（5件程度）かつ**一時利用後破棄**であり継続的な蓄積ではない
- 個人利用の範囲内に近い性格

## スクレイピング検証結果（2026-03-07）

`scripts/test-onboarding-scrape.ts` で検証済み。

| | DELISH KITCHEN | Nadia |
|---|---|---|
| 検索 URL | `https://delishkitchen.tv/search?q={query}` | `https://oceans-nadia.com/search?keyword={query}` |
| 検索ページ取得 | ~725ms | ~1,460ms |
| URL 抽出数 | 12件 | 30件 |
| レシピ解析方式 | JSON-LD | `__NEXT_DATA__` |
| 1件あたりの解析 | 250〜440ms | 17〜20ms |
| 5件の合計 | ~2.3秒 | ~1.9秒 |

**調理時間・材料数の絞り込み:** 両サービスとも検索パラメータでは対応不可。
取得後にアプリ側でフィルタリングする。

## 実装内容

### ① オンボーディング完了フラグの管理

**方針: Supabase の `users` テーブルに `onboarding_completed_at` カラムを追加**

```sql
ALTER TABLE users
ADD COLUMN onboarding_completed_at timestamptz;
```

`NULL` = 未完了、値あり = 完了済み。
完了後はオンボーディング画面にリダイレクトしない。

---

### ② チャット UI（LIFF ページ）

**ルート:** `/onboarding` （`src/app/(protected)/onboarding/page.tsx`）

初回アクセス時のみ表示するリダイレクトロジックを追加（middleware or layout）。

Vercel AI SDK の `useChat` を使ったチャット UI を実装。

```typescript
const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/onboarding/chat',
  initialMessages: [{
    role: 'assistant',
    content: 'はじめまして！好みに合ったレシピを一緒に探しましょう。\n苦手な食材はありますか？（例：パクチー、レバー）\nなければ「なし」と入力してください。'
  }]
})
```

**ヒアリング項目（3項目）:**
1. 好きな食材・料理名（例：鶏肉、唐揚げ）← **必須・検索クエリに使用**
2. 苦手・食べられない食材（例：パクチー、レバー）← 取得後フィルタリングに使用
3. 調理時間の希望（例：30分以内）← 取得後フィルタリングに使用

検索先サイトは **DELISH KITCHEN と Nadia に固定**（ユーザーに選ばせない）。
Q1 が入力された時点で「収集スタート」ボタンを表示する（Q2・Q3 はスキップ可能）。

---

### ③ チャット API（好みのヒアリング）

**エンドポイント:** `POST /api/onboarding/chat`

Gemini（Vercel AI SDK）を使い、会話履歴全体を渡して応答を生成。

システムプロンプトで以下を指示：
- 1回に1つだけ質問する
- 4項目が揃ったら `status: "ready"` を含む JSON を出力する

```json
{
  "status": "ready",
  "preferences": {
    "searchQuery": "鶏肉 唐揚げ",
    "dislikedIngredients": ["パクチー", "レバー"],
    "maxCookingMinutes": 30
  }
}
```

`targetSites` は常に `["delishkitchen", "nadia"]` で固定。

フロントエンドは `status: "ready"` を検知して「収集スタート」ボタンを表示。

---

### ④ 収集ジョブの起動と一時保存

ユーザーが「収集スタート」を押したら：

1. `POST /api/onboarding/start` を呼び出す
2. 好み条件を `onboarding_sessions` テーブルに保存（TTL: 24時間）
3. Supabase Edge Function をバックグラウンドで非同期起動
4. すぐにユーザーへ「収集中」メッセージを返す（制御を返す）

```sql
CREATE TABLE onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  preferences jsonb NOT NULL,        -- 好み条件
  candidates jsonb,                   -- 収集結果（完了後に格納）
  status text DEFAULT 'pending',      -- pending / completed / failed
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '24 hours'
);
```

---

### ⑤ バックグラウンドスクレイピング（Edge Function）

**Edge Function:** `supabase/functions/onboarding-scrape/`

処理フロー：

```
1. Gemini が好み条件 → 検索クエリ（1〜2本）を生成
     例：「鶏肉 簡単」「豚肉」

2. 各サイトの検索ページを fetch
     DELISH KITCHEN: https://delishkitchen.tv/search?q={query}
     Nadia:          https://oceans-nadia.com/search?keyword={query}

3. HTML から URL パターンでレシピリンクを抽出
     DELISH KITCHEN: /recipes/\d+
     Nadia:          /user/\d+/recipe/\d+

4. DELISH KITCHEN / Nadia を Promise.all() で並列スクレイピング（最大 5件ずつ）

5. アプリ側フィルタリング
     - 嫌いな食材を ingredients_raw から除外
     - maxCookingMinutes / maxIngredientCount でフィルタ

6. onboarding_sessions.candidates に結果を保存
7. status を 'completed' に更新
8. LINE Messaging API でユーザーに通知
```

---

### ⑥ LINE 通知

収集完了後、LINE Messaging API で push メッセージを送信。

```
「5件のレシピが見つかりました！
  気に入ったものを選んで登録しましょう 👇
  [レシピを確認する]」
  → LIFF の /onboarding/result ページへ
```

---

### ⑦ レシピ候補選択 UI

**ルート:** `/onboarding/result`

`onboarding_sessions` から候補を取得して表示。

```
┌──────────────────────────────────┐
│  5件のレシピが見つかりました！        │
│  気に入ったものを追加してください      │
└──────────────────────────────────┘

[レシピカード] 鶏の唐揚げ  ⏱20分  🍴4品
              DELISH KITCHEN
              [✓ 追加]  [スキップ]

[レシピカード] 蒸し鶏     ⏱15分  🍴10品
              DELISH KITCHEN
              [✓ 追加]  [スキップ]
...

[まとめて登録する（3件）]  [スキップして始める]
```

---

### ⑧ 一括登録 API

**エンドポイント:** `POST /api/onboarding/complete`

- 選択された URL に対し、既存の `createRecipe()` を実行
- `users.onboarding_completed_at` を更新
- `onboarding_sessions` レコードを削除（一時データ破棄）
- ホーム画面へリダイレクト

---

## 影響ファイル（予定）

**新規作成:**
- `src/app/(protected)/onboarding/page.tsx` — チャット画面
- `src/app/(protected)/onboarding/result/page.tsx` — 候補選択画面
- `src/app/api/onboarding/chat/route.ts` — チャット API
- `src/app/api/onboarding/start/route.ts` — 収集ジョブ起動 API
- `src/app/api/onboarding/complete/route.ts` — 一括登録 API
- `src/components/features/onboarding/chat-screen.tsx` — チャット UI
- `src/components/features/onboarding/recipe-candidates.tsx` — 候補選択 UI
- `supabase/functions/onboarding-scrape/index.ts` — バックグラウンドスクレイピング
- `supabase/migrations/` — `onboarding_sessions` テーブル追加
- `supabase/migrations/` — `users.onboarding_completed_at` カラム追加

**変更:**
- `src/types/database.ts` — 型定義更新
- `src/app/(protected)/layout.tsx` または middleware — 初回リダイレクト制御
- `src/lib/scraper/` — 検索結果ページからの URL 抽出ロジック追加

## 事前確認事項（実装着手前に解決）

### 🔴 技術リスク（高）

**① Edge Function の非同期実行方法 ✅ 解決済み（2026-03-07）**
- `EdgeRuntime.waitUntil()` で即レスポンスを返しつつバックグラウンド処理が可能
- Wall Clock Time 制限: Free プラン 150秒 / 有料プラン 400秒
- 今回の処理（5件スクレイピング）は両サービス並列で **〜5秒以内** → 制限に全く引っかからない
- pg_cron・Queue などの追加インフラは不要
```typescript
Deno.serve(async (req) => {
  EdgeRuntime.waitUntil(scrapeAndNotify(userId, preferences)) // await しない
  return new Response(JSON.stringify({ status: "processing" }), { status: 200 })
})
```

**② LINE Push 通知の User ID 取得 ✅ 解決済み（2026-03-07）**
- `users.line_user_id` カラムに保存済み（`TEXT UNIQUE NOT NULL`）
- スキーマ変更・追加対応は不要
- Push 通知時は `line_user_id` をそのまま使える

### 🟡 UX の決定事項（中）

**③ スキップ時の扱い ✅ 決定済み（2026-03-07）**
- 案A を採用：スキップ時も `onboarding_completed_at` を設定して以降は表示しない
- **再実行の逃げ道として「レシピを探してもらう」機能を設ける**（設定メニュー等から手動で再実行可能）
- 再実行時は `onboarding_completed_at` のリセットは不要（別エントリポイントとして実装）

**④ 既存ユーザーへの対応方針 ✅ 決定済み（2026-03-07）**
- 案B を採用：既存ユーザーは完了済み扱いにして表示しない
- マイグレーションで `onboarding_completed_at = now()` を一括更新
- 既存ユーザーが使いたい場合は「レシピを探してもらう」から任意で利用可能

**⑤ セッション期限切れ時の画面 ✅ 決定済み（2026-03-07）**
- 「期限切れです。もう一度試してください」と表示してオンボーディングトップへ誘導
- `onboarding_completed_at` はまだ設定しない（再試行できる状態を維持）

### 🟢 軽く確認しておく（低）

**⑥ Nadia 検索結果の精度 ✅ 決定済み（2026-03-07）**
- 検証でクエリと無関係なレシピが混入していたが、許容範囲として対応しない
- オンボーディング用途では多少のミスマッチは問題なし

**⑦ robots.txt の確認 ✅ 確認済み（2026-03-07）**
- DELISH KITCHEN: `Disallow` 記述なし → 問題なし
- Nadia: 検索・レシピページの `Disallow` なし → 問題なし
  - ただし GPTBot / ClaudeBot 等 AI クローラーは明示的にブロックされている
  - 今回は通常ブラウザ UA（`html-fetcher.ts`）を使用するため該当しない
  - Nadia が AI アクセスに敏感な点は引き続き意識しておく

---

## 考慮事項

- **スクレイピングの安定性:** 各サービスの HTML 構造変更に対して脆弱。壊れた場合は Jina Reader + Gemini へフォールバック
- **5件に絞る理由:** 2秒以内で完了。オンボーディングに十分な量
- **スキップ:** 「あとで自分で登録する」で /onboarding を完了扱いにしてホームへ
- **TTL 管理:** `onboarding_sessions` は 24 時間で自動削除（Supabase cron or pg_cron）
- **失敗時:** Edge Function がエラーの場合も LINE で「見つかりませんでした」通知
- **再実行:** 将来的に「おすすめを探し直す」として再実行できると便利
- **登録済み重複:** 既存の UNIQUE 制約（URL）で自動処理
- **モバイル体験:** チャット UI はキーボードが開いたときのスクロール挙動に注意

## 検証スクリプト

```bash
# スクレイピング動作確認
npx tsx scripts/test-onboarding-scrape.ts "鶏肉 簡単"
npx tsx scripts/test-onboarding-scrape.ts "豚肉" nadia
npx tsx scripts/test-onboarding-scrape.ts "野菜炒め" delishkitchen
```
