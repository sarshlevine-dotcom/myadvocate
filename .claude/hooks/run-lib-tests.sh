#!/usr/bin/env bash
# run-lib-tests.sh — PostToolUse hook
# Automatically runs the test suite after any edit to src/lib/
#
# Claude Code PostToolUse hooks receive JSON on stdin:
#   { "tool_name": "...", "tool_input": { "file_path": "..." }, "tool_response": {...} }
# Exit code is informational only — action has already occurred.

set -euo pipefail

input=$(cat)

# Extract the file_path from the tool input
file_path=$(echo "$input" | python3 -c "
import json, sys
data = json.load(sys.stdin)
tool_input = data.get('tool_input', {})
print(tool_input.get('file_path', '') or tool_input.get('path', ''))
" 2>/dev/null || echo "")

# Only run tests if the changed file is inside src/lib/
if echo "$file_path" | grep -q "src/lib/"; then
  echo "🧪 src/lib/ was modified — running test suite..."
  echo ""

  # Find the repo root (directory containing package.json)
  repo_root=$(dirname "$file_path")
  while [[ "$repo_root" != "/" && ! -f "$repo_root/package.json" ]]; do
    repo_root=$(dirname "$repo_root")
  done

  if [[ -f "$repo_root/package.json" ]]; then
    cd "$repo_root"
    if npm test -- --reporter=verbose 2>&1; then
      echo ""
      echo "✅ All tests passed."
    else
      echo ""
      echo "❌ Tests failed after editing $file_path"
      echo ""
      echo "Please review the failures above before proceeding."
      echo "Run 'npm test' locally to debug."
      exit 1
    fi
  else
    echo "⚠️  Could not find repo root — skipping automated test run."
    echo "Run 'npm test' manually to verify your changes."
  fi
fi

exit 0
