#!/usr/bin/env bash
# recipe-app プロジェクト（GitHub Projects #5）の Status を読み書きする。
#
#   project-status.sh get <issue番号>             … Status を表示（未登録なら "(not in project)"）
#   project-status.sh set <issue番号> <Status>    … Status を変更（未登録ならプロジェクトに追加してから）
#   project-status.sh list <Status> [<Status>...] … その Status の open な Issue を「番号<TAB>Status<TAB>タイトル」で表示
#
# 前提: gh のトークンに project スコープ（gh auth refresh -h github.com -s project）
# ID は実行時に引く。Status の選択肢を画面で変えてもスクリプトの修正は要らない。
set -euo pipefail

OWNER=mktu
PROJECT=5
REPO=mktu/recipe-app
STATUSES=("Todo" "Plan" "Needs input" "Ready" "In Progress" "In review" "Done")

die() { echo "error: $*" >&2; exit 1; }

check_status() {
  local s
  for s in "${STATUSES[@]}"; do [[ "$s" == "$1" ]] && return 0; done
  die "unknown status '$1' (allowed: ${STATUSES[*]})"
}

check_number() { [[ "$1" =~ ^[0-9]+$ ]] || die "issue number must be numeric: '$1'"; }

items_json() {
  gh project item-list "$PROJECT" --owner "$OWNER" --limit 1000 --format json
}

item_of() { # <issue番号> → "<item id><TAB><status>"（無ければ空）
  items_json | jq -r --arg repo "$REPO" --argjson n "$1" \
    '.items[] | select(.content.repository == $repo and .content.number == $n) | [.id, (.status // "")] | @tsv'
}

cmd_get() {
  check_number "$1"
  local row; row=$(item_of "$1")
  if [[ -z "$row" ]]; then echo "(not in project)"; else cut -f2 <<<"$row"; fi
}

cmd_set() {
  check_number "$1"; check_status "$2"
  local item_id project_id field_json field_id option_id
  item_id=$(item_of "$1" | cut -f1)
  if [[ -z "$item_id" ]]; then
    item_id=$(gh project item-add "$PROJECT" --owner "$OWNER" \
      --url "https://github.com/$REPO/issues/$1" --format json --jq .id)
  fi
  project_id=$(gh project view "$PROJECT" --owner "$OWNER" --format json --jq .id)
  field_json=$(gh project field-list "$PROJECT" --owner "$OWNER" --format json \
    | jq '.fields[] | select(.name == "Status")')
  field_id=$(jq -r .id <<<"$field_json")
  option_id=$(jq -r --arg s "$2" '.options[] | select(.name == $s) | .id' <<<"$field_json")
  [[ -n "$option_id" ]] || die "status '$2' is not an option of the project (add it from the board UI)"
  gh project item-edit --project-id "$project_id" --id "$item_id" \
    --field-id "$field_id" --single-select-option-id "$option_id" >/dev/null
  echo "#$1 → $2"
}

cmd_list() {
  [[ $# -ge 1 ]] || die "list needs at least one status"
  local s; for s in "$@"; do check_status "$s"; done
  local wanted open
  wanted=$(printf '%s\n' "$@" | jq -R . | jq -s .)
  # Projects 側は close 済みも残るので、open な Issue の番号で絞る（1 回の呼び出しで取る）
  open=$(gh issue list --repo "$REPO" --state open --limit 1000 --json number --jq '[.[].number]')
  items_json | jq -r --arg repo "$REPO" --argjson wanted "$wanted" --argjson open "$open" \
    '.items[]
     | select(.content.repository == $repo and .content.type == "Issue")
     | select(.content.number as $n | $open | index($n))
     | select((.status // "") as $s | $wanted | index($s))
     | [.content.number, .status, .content.title] | @tsv'
}

case "${1:-}" in
  get)  [[ $# -eq 2 ]] || die "usage: $0 get <issue>"; cmd_get "$2" ;;
  set)  [[ $# -eq 3 ]] || die "usage: $0 set <issue> <Status>"; cmd_set "$2" "$3" ;;
  list) shift; cmd_list "$@" ;;
  *) sed -n '2,9p' "$0"; exit 1 ;;
esac
