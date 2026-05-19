---
name: update-packages
description: ライブラリアップデートをグループ単位で安全に実施する（changelog 確認・影響調査・PR作成まで）
---

# ライブラリアップデート

以下のフェーズを順番に実行する。ユーザーの確認が必要なフェーズでは必ず立ち止まること。

## パッケージグループ定義

| グループ | 対象パッケージ |
|---------|-------------|
| G1: Next.js コア | `next`, `react`, `react-dom`, `eslint-config-next`, `@types/react`, `@types/react-dom`, `@types/node` |
| G2: Supabase | `@supabase/supabase-js` |
| G3: AI SDK | `ai`, `@ai-sdk/google` |
| G4: UI / スタイリング | `@radix-ui/*`, `radix-ui`, `lucide-react`, `tailwindcss`, `@tailwindcss/postcss`, `tailwind-merge`, `tw-animate-css`, `class-variance-authority`, `clsx`, `vaul`, `cmdk` |
| G5: LINE SDK | `@line/bot-sdk`, `@line/liff` |
| G6: 開発ツール | `typescript`, `eslint`, `husky`, `lint-staged`, `tsx`, `vitest`, `@playwright/test`, `dotenv` |
| G7: その他 | `swr`, `zod`, `schema-dts` |

---

## Phase 1a: グループ選択

`npm outdated` を実行し、アップデート対象があるグループのみ一覧表示する：

```bash
npm outdated
```

フォーマット例：

```
## アップデート対象グループ

G1: Next.js コア  (2パッケージ)
G4: UI / スタイリング  (5パッケージ)
G6: 開発ツール  (1パッケージ)

どのグループを更新しますか？
```

ユーザーのグループ選択を待つ。

---

## Phase 1b: パッケージ選択

選択されたグループに属するパッケージについて、npm から最新バージョンを取得して現在バージョンと比較表示する：

```bash
npm show [package] version
```

フォーマット例：

```
## G4: UI / スタイリング の更新対象

  lucide-react              0.562.0 → 0.580.0  (minor)
  tailwindcss               4.0.14  → 4.1.3    (minor)
  @radix-ui/react-dialog    1.1.14  → 1.1.15   (patch)
  @radix-ui/react-select    2.2.5   → 2.2.6    (patch)
  tailwind-merge            3.3.0   → 3.4.0    (patch)

どれを更新しますか？（例: 全部 / lucide-react tailwindcss / 1 3）
※ バージョンの詳細は次のフェーズで確認します
```

ユーザーのパッケージ選択を待つ。

---

## Phase 2: changelog 調査（AI が自動実行）

**選択されたパッケージのみ**、WebSearch / WebFetch で changelog・release notes を調査する。

**調査対象:** 現在バージョンから latest までの全変更

各パッケージについて以下をレポートする：

```
### lucide-react (0.562.0 → 0.580.0)
- Breaking changes: なし
- 主な変更: アイコン追加のみ

### tailwindcss (4.0.14 → 4.1.3)
- Breaking changes: あり（設定ファイルの構文変更）
- 主な変更: xxx
```

レポート表示後、次のフェーズに進む旨を伝える。

---

## Phase 3: バージョン確定（ユーザー）

Phase 2 のレポートを踏まえて、各パッケージのターゲットバージョンをユーザーに確認する：

```
各パッケージのバージョンを指定してください（Enter で推奨バージョン）:
lucide-react: [0.580.0]
tailwindcss:  [?]
```

ユーザーが指定したバージョンを確定してから次のフェーズへ。

---

## Phase 4: 影響範囲調査（AI が調査 → ユーザーが最終判断）

確定したバージョンの **Breaking changes があるパッケージのみ** を対象に、プロジェクトのコードを実際に調査して影響箇所を特定する。

調査はコードベースを Grep / Read で読んで実施する。結果を以下の形式でレポートする：

```
### tailwindcss (4.0.14 → 4.1.3) の影響調査

**バージョン別変更概略:**
- v4.1.0: 設定ファイルの構文変更（`content` オプション廃止）、新しいユーティリティ追加
- v4.1.1: バグ修正のみ
- v4.1.2: パフォーマンス改善、`@apply` の挙動が一部変更
- v4.1.3: バグ修正のみ

**コード影響調査:**

影響あり:
- tailwind.config.ts:12 - `content` オプションの記述変更が必要
- src/styles/globals.css:5 - `@apply` の挙動変更により要確認

影響なし:
- その他のファイルは影響なし
```

レポート表示後、**「影響なし」と判断した場合も含めて、必ずユーザーに内容を確認してもらい、Phase 4b に進んでよいか最終判断を待つ。** AI の判断だけで次のフェーズに進んではならない。

---

## Phase 4b: 手動対応フェーズ（ユーザーと協議）

Phase 4 の調査結果を踏まえて、以下のパターンで対応を決める：

### 影響なし
そのまま Phase 5 へ進む。

### サクッと直せそうな修正がある場合
ユーザーに確認のうえ、その場でコーディングして修正する。修正完了後 Phase 5 へ。

### 複雑な修正が必要なパッケージがある場合
- そのパッケージを今回の更新対象から除外する
- GitHub Issue を作成する（タイトル例: `[update] tailwindcss v4.1 Breaking change 対応`）
- 他に更新できるパッケージが残っている場合 → Phase 5 へ
- 全パッケージが複雑な修正必要で除外された場合 → **Issue 作成のみで終了**

どのパターンに該当するかをユーザーに明示してから次のアクションに移る。

---

## Phase 5: 実行

以下を順番に実行する：

### 1. ブランチ作成
```bash
git checkout develop && git pull
git checkout -b feature/update-[グループ名]-libs
```
（例: `feature/update-ui-libs`, `feature/update-ai-sdk`）

### 2. パッケージ更新
確定したバージョンで `package.json` を更新し、インストールする：
```bash
npm install [package]@[version] ...
```

### 3. lint + build 確認
```bash
npm run lint
npm run build
```

**失敗した場合:**
- エラー内容を表示してユーザーに報告
- サクッと直せそうならその場で修正して再実行
- 複雑な場合はその旨を報告して終了（ブランチは残す）

### 4. PR 作成
```bash
gh pr create --base develop --title "chore: update [グループ名] packages" --body "..."
```

PR body には以下を含める：
- 更新パッケージ一覧（バージョン Before/After）
- Breaking changes の有無と対応内容
- 除外したパッケージがある場合はその理由と Issue リンク
