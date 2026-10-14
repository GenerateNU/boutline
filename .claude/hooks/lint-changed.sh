#!/usr/bin/env bash
# Stop hook: lint the stacks with uncommitted changes and block the stop on failure,
# showing Claude only the tail of the failing output.
set -uo pipefail

input="$(cat)"
# A second stop inside the same hook-driven continuation means Claude already saw
# the failure once; blocking again would loop.
grep -q '"stop_hook_active": *true' <<<"$input" && exit 0

root="$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$root" || exit 0

changed="$( { git diff --name-only --diff-filter=d HEAD -- frontend backend
  git ls-files --others --exclude-standard -- frontend backend; } | sort -u)"
[ -z "$changed" ] && exit 0

# Skip re-linting a tree that already passed, so conversational turns stay fast.
stamp="$(git rev-parse --git-path claude-lint-ok)"
digest="$( { git diff HEAD -- frontend backend
  git ls-files --others --exclude-standard -z -- frontend backend | xargs -0 cat 2>/dev/null; } | shasum | cut -d' ' -f1)"
[ -f "$stamp" ] && [ "$(cat "$stamp")" = "$digest" ] && exit 0

failed=0
report=""

fe_files="$(grep -E '^frontend/.*\.(ts|tsx|js|jsx|mjs|cjs)$' <<<"$changed" | sed 's|^frontend/||')"
if [ -n "$fe_files" ]; then
  if ! out="$(cd frontend && xargs bun run lint <<<"$fe_files" 2>&1)"; then
    failed=1
    report+=$'frontend lint failed:\n'"$(tail -n 40 <<<"$out")"$'\n'
  fi
fi

if grep -qE '^backend/.*\.go$|^backend/go\.(mod|sum)$' <<<"$changed"; then
  if ! out="$(make --no-print-directory -C backend lint 2>&1)"; then
    failed=1
    report+=$'backend lint failed:\n'"$(tail -n 40 <<<"$out")"$'\n'
  fi
fi

if [ "$failed" -eq 1 ]; then
  printf '%s' "$report" >&2
  exit 2
fi
echo "$digest" >"$stamp"
