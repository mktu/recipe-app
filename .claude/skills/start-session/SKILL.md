---
name: start-session
description: セッション開始時に open Issue を読んで現在地を把握し、worktree で作業するか判断する
---

# セッション開始

**進捗の正本は GitHub Issues。** 環境・運用の gotcha は docs 側にある（`docs/OPERATIONS.md` 他）。
かつての `SESSION.md` は廃止済みなので探さないこと。

## 1. 現在地を読む

```bash
gh issue list --state open
```

## 2. 残っている worktree を棚卸しする

```bash
git worktree list
```

メインのチェックアウト以外に worktree があれば、**それぞれが片付け済みか**を確認する。

```bash
# 各 worktree のブランチと PR の状態
git -C <worktree-path> rev-parse --abbrev-ref HEAD
gh pr list --head <branch> --state all --json number,state,mergedAt
```

PR がマージ済み（`state: MERGED`）で未コミットの変更が無い worktree は**用済み**。
ユーザーに削除を提案する（実際の削除手順は `/end-session` と同じ）。

> 放置された worktree は `git status` のノイズになり、ブランチ名の衝突も起こす。

## 3. 状態サマリーを表示

```
## 現在の状態

**open な Issue:**
- [#番号 タイトル を数件]

**残っている worktree:**
- [パス（ブランチ / PR 状態）。なければ「なし」]

**関係しそうな注意点:**
[着手内容に関係しそうな gotcha を docs から抜粋。なければ「特になし」]
```

## 4. 作業内容と worktree 利用を確認する

「何から始めますか？」と尋ね、内容が決まったら **worktree を使うかどうかを判断して提案する**。

| 作業内容 | worktree |
|---|---|
| Issue の実装（コード・マイグレーション・Edge Function） | **使う** |
| 複数ファイルにまたがる docs 更新 | **使う** |
| 他の作業と並行して進めたい / 長くなりそう | **使う** |
| 調査・質問・コードリーディングのみ | 使わない |
| 1ファイルの typo 修正など即終わるもの | 使わない |

**判断基準は「PR を出す作業かどうか」。** 出すなら worktree を使う。

使う場合は `EnterWorktree` ツールで作成する（ツールが使えない環境では以下）。

```bash
git worktree add .claude/worktrees/<name> -b feature/<xxx> origin/develop
```

**ブランチは必ず `origin/develop` 起点にする。** `EnterWorktree` は既定で
`origin/main` から切るため、作成後に `git reset --hard origin/develop` で揃えること
（main は develop のマージコミットを持つので、揃えないと PR に無関係なコミットが並ぶ）。

ブランチ名は CLAUDE.md の命名規則に従う（`feature/add-xxx` / `fix-` / `refactor-` / `docs-`）。
