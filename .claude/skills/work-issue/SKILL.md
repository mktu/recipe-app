---
name: work-issue
description: Issue を GitHub Projects の Status に沿って進める（Plan → 計画を立てて Ready、In Progress → 実装して Draft PR）。引数に Issue 番号、無しなら作業待ちの一覧から選ぶ
---

# Issue を進める（イシュー駆動開発）

Issue の状態は [recipe-app プロジェクト（#5）](https://github.com/users/mktu/projects/5) の **Status 列**で管理する（ラベルは使わない）。
このスキルは呼ばれたときに、その Issue の Status に応じて 1 段階進める。勝手に次の段階へは進まない。

| Status | 意味 | 誰が動かすか |
|---|---|---|
| `Todo` | 未整理（新しい Issue は自動でここに入る） | 自動 |
| `Plan` | 計画してほしい | 人 |
| `Needs input` | 人の番（不明点への回答・判断） | AI |
| `Ready` | 計画済み。着手待ち | AI |
| `In Progress` | 実装してよい | 人 |
| `In review` | Draft PR が出ていて、人のレビュー待ち | AI |
| `Done` | 完了 | 人 |

**AI は `Ready` で止まる。`In Progress` に移すのは人。** 単純なタスク向けのフローなので、重いものは計画の段階で対象外にする（2-2）。

## 0. 道具

Status の読み書きは必ずスクリプトで行う（ID の取り回しを手でやらない）。

```bash
S=.claude/skills/work-issue/scripts/project-status.sh
$S get <番号>                 # Status を表示
$S set <番号> "<Status>"      # Status を変更
$S list "Plan" "Needs input"  # その Status の open な Issue 一覧
```

`project` スコープが無いと失敗する。そのときはユーザーに、普段のターミナルで
`gh auth refresh -h github.com -s project` を実行してもらう（Claude Code 経由では対話の認証ができない）。

### コメントの目印

gh は自分のアカウントで動くので、**AI のコメントも人のコメントも投稿者は同じ**になる。
AI のコメントは、1 行目に次のどれかの目印を必ず入れて区別する。

| 目印 | 用途 |
|---|---|
| `<!-- work-issue:plan -->` | 計画（1 つだけ。更新は編集で行う） |
| `<!-- work-issue:question -->` | 計画中の質問・計画を更新した知らせ |
| `<!-- work-issue:blocked branch=<ブランチ名> -->` | 実装中に止まった |
| `<!-- work-issue:pr -->` | Draft PR を作った |

**最後のコメントに目印が無ければ、人が返信済み**と判定する。

```bash
gh issue view <番号> --json comments --jq '.comments[-1].body // ""' | head -1
```

## 1. 対象を決める

- **番号の指定あり**: `$S get <番号>` で Status を見て 2 の分岐へ
- **番号の指定なし**: `$S list "Plan" "Needs input" "In Progress"` を表示して選んでもらう。
  `Needs input` は人が返信済みのものだけ、`In Progress` は計画コメントがあるものだけ示す
  （`In Progress` には手作業の Issue も入るため）
- **「Plan を全部計画して」**: `Plan` の Issue を順に 2-1〜2-4 で処理する（**まとめ処理モード**）。
  まとめて処理するのは計画だけ。実装はまとめて処理しない

### Status ごとの分岐

| Status | すること |
|---|---|
| `Todo` | ユーザーがこのスキルで指定した ＝ 計画の依頼とみなし、`Plan` に移して 2 へ |
| `Plan` | 2（計画） |
| `Needs input` | 最新の目印が `blocked` なら 3（実装の再開）、それ以外は 2（計画の更新） |
| `Ready` | 計画を要約して「着手しますか？」と聞く。人が着手すると答えたら `In Progress` に移して 3 へ |
| `In Progress` | 計画コメントがあれば 3（実装）、無ければ「先に計画しますか？」と聞く |
| `In review` / `Done` | 何もしない。PR へのレビュー指摘に対応する場合は、指摘内容を伝えてもらって通常の作業として対応する |

## 2. 計画（Plan / Needs input）

### 2-1. 読む
- Issue 本文と全コメント（人の返信があれば、それを踏まえる）
- `docs/OPERATIONS.md` と `docs/ARCHITECTURE.md`、CLAUDE.md の「作業前に読む」表で該当する doc
- 関係するコード

### 2-2. 対象外の判定
次に当てはまるものは**このフローの対象外**。計画せずに、理由を書いた `question` コメントを付けて `Needs input` に移し、止まる（人が手作業で進めるかを決める）。

- migration・RLS・RPC などスキーマの変更
- 認証（`src/lib/auth/`、`src/lib/api/auth-guard.ts`）、LINE Webhook の署名検証
- Edge Function・cron・バッチ
- 変更が大きい（目安: 変更ファイルが 10 を超える、設計判断が複数ある）

### 2-3. 計画コメントを書く
既に `plan` の目印があるコメントがあれば**編集して上書き**し、無ければ新しく付ける。

```markdown
<!-- work-issue:plan -->
## 計画

**目的:** （Issue が解決したいこと。1〜2 文）

**方針:**
- 

**変更予定:** `path/to/file.ts`（何をするか）／ …

**検証方法:** （テストの追加・手元での確認の手順。確認できないものは人に渡す前提で書く）

**未決事項:**
- [ ] （判断が必要な点。できれば選択肢 A / B と、AI のおすすめ）

（最終更新: YYYY-MM-DD）
```

編集は REST で行う。

```bash
# --paginate の --jq はページごとに走るので、[-1] ではなく tail で最後の 1 件を取る
id=$(gh api repos/mktu/recipe-app/issues/<番号>/comments --paginate \
  --jq '.[] | select(.body | startswith("<!-- work-issue:plan -->")) | .id' | tail -1)
gh api -X PATCH repos/mktu/recipe-app/issues/comments/$id -F body=@<計画のファイル>
```

### 2-4. 未決事項を解消して Status を移す
- **対話中**: 未決事項はその場でユーザーに聞き、答えを計画に反映する。未決事項が無くなったら `Ready` へ
- **まとめ処理モード／ユーザーが不在**: 未決事項が残っていれば、`question` コメント
  （「計画を書きました。未決事項に回答してください」）を付けて `Needs input` へ。無ければ `Ready` へ
- 計画を更新したときは、何が変わったかを `question` コメントで 1〜2 行書く（編集は通知されないため）

**`Ready` で止まる。** 「着手するときは Status を `In Progress` にするか、もう一度 `/work-issue <番号>` を実行してください」と伝えて終わる。

## 3. 実装（In Progress / blocked からの再開）

### 3-1. 準備
- 計画コメントと、それ以降のコメントを読む。計画で書いた doc も読む
- worktree を `origin/develop` 起点で作る（手順は `/start-session` の 4 と同じ）。
  ブランチ名は `feature/<add|fix|refactor|docs>-<内容>-<Issue番号>`。
  `blocked` からの再開なら、目印にあるブランチの worktree を使う

### 3-2. 実装する
計画どおりに実装する。計画から外れたら、その理由を PR に書く。迷ったときの判断基準:

- **影響が小さい判断**（命名、細かい UI、エラーメッセージの文言など）: 仮定を置いて進め、PR の 👀 欄に書く
- **影響が大きい判断**（仕様の解釈が分かれる、対象外の領域に触れる必要が出た、計画が成り立たない）: 止まる
  - 対話中ならその場で聞く
  - 不在なら、WIP をコミットして push し、`blocked` コメント
    （どこまで進んだか／何を決めてほしいか。できれば選択肢つき）を Issue に付けて `Needs input` へ

### 3-3. 確認する
```bash
npm run lint && npm test && npm run build
```
`npm run test:e2e` はローカルで回さない（CLAUDE.md「E2E はローカルで常時回さない」）。Draft PR の CI に任せる。

差分を計画と突き合わせて読み直す（AI レビュー #255 と動作確認 #256 が入るまでは、この自己チェックだけ）。

### 3-4. Draft PR を作る
コミットして push し、**`--draft --base develop`** で PR を作る（base を省くと main に向く）。

```markdown
## Summary
- 

## AI が確認したこと ✅
- lint / test / build が通った
- （計画との一致、など実際に確かめたことだけ書く。E2E の CI が緑でも、確認できている範囲は限られる: docs/OPERATIONS.md）

## 人に見てほしいこと 👀
- （仮定を置いて進めた判断、計画から外れた点、自信が低い箇所）

## 人に確認してほしいこと（動作確認）
- [ ] （実機の LINE、iPhone の WebKit、staging など、AI が確認できなかったもの）

Closes #<番号>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

`Closes #` は develop 向けの PR では発火しない（紐付けのために書く。Issue は main マージ後に手動で閉じる）。

最後に `pr` コメント（PR の URL）を Issue に付け、`In review` に移す。
