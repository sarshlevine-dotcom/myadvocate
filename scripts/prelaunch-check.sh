#!/bin/bash
#
# Pre-Launch Engineering Check Script
# Runs all pre-launch checks in sequence and produces a pass/fail report
#

set +e  # Don't exit on error - we want to collect all failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=()

# Function to print status
print_status() {
    local check_name=$1
    local status=$2
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}[PASS]${NC} $check_name"
    else
        echo -e "${RED}[FAIL]${NC} $check_name"
    fi
}

echo "=========================================="
echo "  PRE-LAUNCH ENGINEERING CHECKS"
echo "=========================================="
echo ""

# ============================================
# CHECK 1: ESLint
# ============================================
echo "--- Check 1: ESLint ---"
if npm run lint > /tmp/lint_output.txt 2>&1; then
    print_status "ESLint" "PASS"
else
    print_status "ESLint" "FAIL"
    FAILURES+=("ESLint: Errors found - see /tmp/lint_output.txt for details")
    cat /tmp/lint_output.txt
fi
echo ""

# ============================================
# CHECK 2: Build
# ============================================
echo "--- Check 2: Build ---"
if npm run build > /tmp/build_output.txt 2>&1; then
    print_status "Build" "PASS"
else
    print_status "Build" "FAIL"
    FAILURES+=("Build: Errors found - see /tmp/build_output.txt for details")
    cat /tmp/build_output.txt
fi
echo ""

# ============================================
# CHECK 3: Tests
# ============================================
echo "--- Check 3: Tests ---"
if npm test -- --reporter=verbose > /tmp/test_output.txt 2>&1; then
    print_status "Tests" "PASS"
else
    print_status "Tests" "FAIL"
    FAILURES+=("Tests: Failed - see /tmp/test_output.txt for details")
    cat /tmp/test_output.txt
fi
echo ""

# ============================================
# CHECK 4: Trust Pages Exist
# ============================================
echo "--- Check 4: Trust Pages ---"

TRUST_PAGES=(
    "about"
    "editorial-policy"
    "medical-review-policy"
    "reviewer-credentials"
    "medical-disclaimer"
    "citation-policy"
    "update-policy"
)

MISSING_PAGES=()
for page in "${TRUST_PAGES[@]}"; do
    if [ ! -d "src/app/$page" ]; then
        MISSING_PAGES+=("$page")
    fi
done

if [ ${#MISSING_PAGES[@]} -eq 0 ]; then
    print_status "Trust Pages" "PASS"
else
    print_status "Trust Pages" "FAIL"
    FAILURES+=("Trust Pages: Missing pages: ${MISSING_PAGES[*]}")
fi
echo ""

# ============================================
# CHECK 5: .env.local NOT committed
# ============================================
echo "--- Check 5: .env.local not committed ---"
if git status --porcelain | grep -q "^\s*..*.env.local"; then
    print_status ".env.local not committed" "FAIL"
    FAILURES+=(".env.local is committed to git")
else
    print_status ".env.local not committed" "PASS"
fi
echo ""

# ============================================
# CHECK 6: TODO/FIXME in src/lib/
# ============================================
echo "--- Check 6: TODO/FIXME comments ---"
if [ -d "src/lib" ]; then
    TODO_COUNT=$(grep -r -n -E "TODO|FIXME" src/lib/ 2>/dev/null | wc -l)
    if [ "$TODO_COUNT" -eq 0 ]; then
        print_status "TODO/FIXME comments" "PASS"
    else
        print_status "TODO/FIXME comments" "FAIL"
        FAILURES+=("TODO/FIXME: Found $TODO_COUNT TODO/FIXME comments in src/lib/")
        grep -r -n -E "TODO|FIXME" src/lib/ 2>/dev/null | head -20
    fi
else
    print_status "TODO/FIXME comments" "PASS"
fi
echo ""

# ============================================
# SUMMARY
# ============================================
echo "=========================================="
echo "  SUMMARY"
echo "=========================================="

if [ ${#FAILURES[@]} -eq 0 ]; then
    echo -e "${GREEN}OVERALL: PASS${NC}"
    echo "All pre-launch checks completed successfully!"
    exit 0
else
    echo -e "${RED}OVERALL: FAIL${NC}"
    echo ""
    echo "Failed checks:"
    for i in "${!FAILURES[@]}"; do
        echo "  $((i+1)). ${FAILURES[$i]}"
    done
    exit 1
fi