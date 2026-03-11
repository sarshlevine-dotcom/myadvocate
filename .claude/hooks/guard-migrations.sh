#!/usr/bin/env bash
# guard-migrations.sh — PreToolUse hook
# Blocks any attempt to edit files inside supabase/migrations/
#
# Claude Code PreToolUse hooks receive JSON on stdin:
#   { "tool_name": "...", "tool_input": { "file_path": "...", ... } }
# Exit 0 = allow | Exit 1 (+ stdout message) = block

set -euo pipefail

input=$(cat)

# Extract the file_path from the tool input
file_path=$(echo "$input" | python3 -c "
import json, sys
data = json.load(sys.stdin)
tool_input = data.get('tool_input', {})
print(tool_input.get('file_path', '') or tool_input.get('path', ''))
" 2>/dev/null || echo "")

# Check if the path is inside supabase/migrations/
if echo "$file_path" | grep -q "supabase/migrations/"; then
  echo "🚫 BLOCKED: Past migrations are immutable."
  echo ""
  echo "The file you attempted to edit is:"
  echo "  $file_path"
  echo ""
  echo "CLAUDE.md Rule: NEVER edit past migrations — create a new one instead."
  echo ""
  echo "To add a change, run:"
  echo "  supabase migration new <migration_name>"
  echo ""
  echo "Then edit the newly created file in supabase/migrations/."
  exit 1
fi

exit 0
