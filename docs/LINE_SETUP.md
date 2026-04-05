# LINE 開発環境構成

## チャネル構成

LINE では LIFF と Messaging API で別のチャネルタイプが必要。開発・本番でチャネルを分離している:

```
プロバイダー（RecipeHub）
├── LINE Login チャネル（開発用）      ← LIFF 開発・ステージング
├── LINE Login チャネル（本番用）      ← LIFF 本番
├── Messaging API チャネル（開発用）   ← Webhook 開発・ステージング
└── Messaging API チャネル（本番用）   ← Webhook 本番
```

同じプロバイダー内であればユーザー ID は統一される。

## 環境別の構成

| 環境 | 用途 | LIFF | Webhook | DB |
|------|------|------|---------|-----|
| **ローカル + ngrok** | 機能開発 | DevAuthProvider（モック） | ngrok URL | ローカル Supabase |
| **Vercel Preview（develop）** | ステージング | 開発用 LIFF | develop ブランチ URL | staging Supabase |
| **Vercel Production（main）** | 本番 | 本番 LIFF | 本番 URL | 本番 Supabase |

> **注意:** Vercel Preview の Deployment Protection（Standard Protection）を **Disabled** にしないと、LINE サーバーからの Webhook が 401 で弾かれてアプリに到達しない。
> Vercel Dashboard → Settings → General → Deployment Protection → **Off** に設定する。

## URL 設定（LINE Developers コンソール）

チャネルが dev/prod で分離されているため、URL の手動切り替えは不要。

| 項目 | 開発用チャネル | 本番用チャネル |
|------|--------------|--------------|
| LIFF エンドポイント URL | develop ブランチの Vercel URL | 本番 Vercel URL |
| Webhook URL | `https://recipe-app-git-develop-mktus-projects.vercel.app/api/webhook/line` | `https://<本番ドメイン>/api/webhook/line` |

## ローカル開発フロー

LINE Webhook のローカルテストは ngrok 経由で行う:

```bash
# 1. ngrok でローカルを公開
npx ngrok http 3000

# 2. 表示された URL を LINE Developers の開発用 Webhook URL に一時設定
#    例: https://xxxx.ngrok.io/api/webhook/line

# 3. 開発サーバー起動
npm run dev
```

**注意:** ngrok 無料プランでは URL が毎回変わるため、起動のたびに Webhook URL の更新が必要。テスト後は develop ブランチの URL に戻す。

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
