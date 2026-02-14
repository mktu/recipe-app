# LINE 開発環境構成

## チャネル構成

LINE では LIFF と Messaging API で別のチャネルタイプが必要:

```
プロバイダー（RecipeHub）
├── LINE Login チャネル      ← LIFF 用（ユーザー認証・アプリ）
└── Messaging API チャネル   ← Bot 用（Webhook で URL 受信）
```

同じプロバイダー内であればユーザー ID は統一される。

## 環境別の構成

| 環境 | 用途 | LIFF | Webhook | DB |
|------|------|------|---------|-----|
| **ローカル + ngrok** | 機能開発 | DevAuthProvider（モック） | ngrok URL | ローカル Supabase |
| **Vercel** | 検証・本番 | 本物の LIFF | Vercel URL | リモート Supabase |

## URL 設定（LINE Developers コンソール）

1チャネル運用のため、開発↔本番で URL の切り替えが必要:

| 項目 | ローカル開発時 | 本番時 |
|------|----------------|--------|
| LIFF エンドポイント URL | （DevAuthProvider で不要） | `https://recipe-app-wine-three.vercel.app` |
| Webhook URL | `https://xxxx.ngrok.io/api/webhook/line` | `https://recipe-app-wine-three.vercel.app/api/webhook/line` |

## ローカル開発フロー

```bash
# 1. ngrok でローカルを公開
npx ngrok http 3000

# 2. 表示された URL を LINE Developers の Webhook URL に設定
#    例: https://xxxx.ngrok.io/api/webhook/line

# 3. 開発サーバー起動
npm run dev
```

**注意:** ngrok 無料プランでは URL が毎回変わるため、起動のたびに Webhook URL の更新が必要。

## 将来: 本番・開発環境の分離

1チャネル運用で URL 切り替えが煩雑になった場合、同じプロバイダー内にチャネルを追加して分離できる:

```
プロバイダー（RecipeHub）
├── LINE Login チャネル（開発用）      ← LIFF 開発
├── LINE Login チャネル（本番用）      ← LIFF 本番
├── Messaging API チャネル（開発用）   ← Webhook 開発
└── Messaging API チャネル（本番用）   ← Webhook 本番
```

**分離後の運用:**

| 項目 | 1チャネル運用 | 分離運用 |
|------|---------------|----------|
| URL 切り替え | 手動で都度変更 | 不要 |
| データ分離 | 混在 | 完全分離 |
| 管理コスト | 少ない | チャネル4つ管理 |

環境変数を `.env.local`（開発）と Vercel 環境変数（本番）で分けることで切り替え不要になる。

## リッチメニュー設定

LINE Official Account Manager でリッチメニューを設定する手順。

### 1. アクセス

https://manager.line.biz/ → 該当アカウント → ホーム → リッチメニュー → 作成

### 2. テンプレート

「大」サイズ → 1段目全幅 + 2段目3分割のテンプレートを選択

```
┌─────────────────────────┐
│      レシピ一覧          │  ← 1段目（全幅）
├────────┬────────┬───────┤
│食材で探す│レシピ追加│ 使い方 │  ← 2段目（3分割）
└────────┴────────┴───────┘
```

### 3. ボタン設定

| 位置 | ラベル | アクション | 設定値 |
|------|--------|------------|--------|
| 1段目 | レシピ一覧 | リンク | `https://liff.line.me/{LIFF_ID}` |
| 2段目左 | 食材で探す | リンク | `https://liff.line.me/{LIFF_ID}` |
| 2段目中 | レシピ追加 | リンク | `https://liff.line.me/{LIFF_ID}/recipes/add` |
| 2段目右 | 使い方 | テキスト | `使い方` |

> `{LIFF_ID}` は環境変数 `NEXT_PUBLIC_LIFF_ID` の値

### 4. 画像

- サイズ: 2500x1686px（大）
- 画像ファイル: `public/rich-menu.png`

### 5. 「使い方」の動作

リッチメニューから「使い方」テキストが送信されると、Webhook がヘルプメッセージを返す。
対応キーワード: `使い方`, `ヘルプ`, `help`, `?`, `？`
