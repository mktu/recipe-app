---
name: cleanup-worktrees
description: 用済みの worktree とローカルブランチを片付ける。🧹 の帯（片付け忘れの worktree）が出たとき、「worktree を片付けて」と言われたときに使う
---

# worktree を片付ける

Issue のブランチ（末尾が Issue 番号）の worktree は、ふだんは `/work-issue` の片付け（4-4）で消える。
ここで扱うのは、それ以外で残ったもの: Issue 番号の無いブランチ、`/work-issue` を通さずにマージしたもの、前のセッションの消し忘れ。
🧹 の帯（`issue-status`）は、PR がマージ済みか Issue が close 済みのブランチの worktree を出している。

## 消してよいかの判断

```bash
git worktree list
git -C <path> status --porcelain                      # 未コミット
git -C <path> log --oneline origin/<branch>..HEAD     # 未 push
gh pr list --head <branch> --state all --json number,state,mergedAt
```

| 状態 | 判断 |
|---|---|
| PR がマージ済み（または Issue が close 済み）で、未コミット・未 push が無い | 消す |
| PR が open | 残す |
| 未コミット、または未 push のコミットがある | 残して、中身をユーザーに報告する（PR 化し忘れのこともある） |

**削除はユーザーに確認してから行う。**

## 消す前に、Edge Runtime が掴んでいないか見る

Edge Runtime コンテナは `functions:serve` を起動したディレクトリの絶対パスを握る。
そのまま worktree を消すと、コンテナは存在しないパスを参照し続け、**ホーム一覧が黙って空になる**（`docs/SUPABASE_LOCAL.md`）。

```bash
docker inspect supabase_edge_runtime_recipe-app --format '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}'
```

消す worktree のパスが出力に含まれていたら、メインのチェックアウトで serve し直してから消す
（生成物は gitignore なので、build からやり直す）。

```bash
npm run functions:build && npm run functions:serve
```

## 消す

このセッションが消す worktree の中にいるときは、`ExitWorktree`（`action: "keep"`）で抜けてから消す。
`path` で入った worktree は `ExitWorktree` では消えない。

```bash
git worktree remove .claude/worktrees/<name>
git branch -d <ブランチ名>   # squash マージなどで -d が拒否したら、マージ済みを確かめてから -D
git worktree prune
```

消したもの・残したもの（と理由）を報告して終わる。
