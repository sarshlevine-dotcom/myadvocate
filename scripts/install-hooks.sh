#!/usr/bin/env bash
# install-hooks.sh — Install local git hooks for MyAdvocate
#
# Run once after cloning:
#   bash scripts/install-hooks.sh

set -euo pipefail

HOOKS_DIR=".git/hooks"
SCRIPTS_DIR="scripts"

if [[ ! -d "$HOOKS_DIR" ]]; then
  echo "❌ .git/hooks directory not found. Are you in the repo root?"
  exit 1
fi

echo "Installing git hooks..."

# pre-commit: ESLint on staged files
cp "$SCRIPTS_DIR/pre-commit" "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"
echo "  ✅ pre-commit (ESLint on staged .ts/.tsx files)"

echo ""
echo "All hooks installed. They will run automatically on each commit."
echo ""
echo "Hooks installed:"
echo "  .git/hooks/pre-commit — ESLint check on staged files"
echo ""
echo "Claude Code guardrail hooks are configured in .claude/settings.json"
echo "  PreToolUse  — blocks editing past migrations (supabase/migrations/)"
echo "  PostToolUse — runs tests after src/lib/ changes"
