#!/usr/bin/env bash
# validate-mission-completion.sh — 9 hard-fail gates for mission closure
# Usage: validate-mission-completion.sh [--json] <mission-ticket-path>
# Exit: 0 = all gates pass, 1 = one or more gates BLOCKED/FAILED
#
# Gates (each hard-fail, no WARN downgrades):
#   G1  TypeScript compilation          — npx tsc --noEmit must pass
#   G2  Test execution                  — npm test must pass
#   G3  Test coverage of changed files  — changed .ts files need .test.ts or TD ticket
#   G4  Git working tree clean          — no uncommitted changes
#   G5  Mission Resolution section      — ## Resolution present in ticket
#   G6  Remaining Technical Debt        — non-empty debt subsection with tickets or skip reasons
#   G7  Manual application test         — evidence of app start + flows walked
#   G8  Cross-route regression check    — shared util consumers verified
#   G9  Anti-bypass integrity           — every PASS claim backed by documented evidence in ticket
#
# Output: PASS | FAIL | BLOCKED per gate. BLOCKED = missing evidence (anti-bypass enforcement).

set -euo pipefail

# ── Color & label constants ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS="${GREEN}PASS${NC}"
FAIL="${RED}FAIL${NC}"
BLOCKED="${RED}BLOCKED${NC}"

# ── Paths ────────────────────────────────────────────────────────────────
PROJECT_DIR="${PROJECT_DIR:-${GITHUB_WORKSPACE:-/srv/dev/tamarine-app}}"
AGENT_DIR="/srv/dev/agents/tamarine-bot"

# ── State ────────────────────────────────────────────────────────────────
JSON_MODE=false
TICKET=""
FAILURES=0
BLOCKED_COUNT=0
declare -A GATE_RESULTS
declare -A GATE_DETAILS
declare -A GATE_BLOCKED

# ── Parse args ───────────────────────────────────────────────────────────
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
        *) TICKET="$arg" ;;
    esac
done

# ── Helpers ───────────────────────────────────────────────────────────────
strip_ansi() {
    sed 's/\x1b\[[0-9;]*m//g' <<< "${1:-}"
}

# ── JSON helpers ─────────────────────────────────────────────────────────
json_escape() {
    local s="${1:-}"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\t'/\\t}"
    echo -n "$s"
}

json_output() {
    # Final JSON output after all gates run
    local pass_count=$((9 - FAILURES - BLOCKED_COUNT))
    echo -n '{'
    echo -n "\"passed\":$pass_count,"
    echo -n "\"failed\":$FAILURES,"
    echo -n "\"blocked\":$BLOCKED_COUNT,"
    echo -n "\"total\":9,"
    echo -n '"gates":{'
    local first=true
    for i in $(seq 1 9); do
        $first || echo -n ','
        first=false
        local result="${GATE_RESULTS[$i]:-UNKNOWN}"
        local detail="${GATE_DETAILS[$i]:-}"
        echo -n "\"G${i}\":{"
        echo -n "\"status\":\"$result\","
        echo -n "\"detail\":\"$(json_escape "$detail")\""
        echo -n '}'
    done
    echo -n '},'
    echo -n "\"ticket\":\"$(json_escape "$TICKET")\","
    echo -n "\"project\":\"$(json_escape "$PROJECT_DIR")\""
    echo -n '}'
    echo
}

header() {
    if $JSON_MODE; then return; fi
    echo "============================================"
    echo " Mission Completion Validator (9 Gates)"
    echo "============================================"
    echo "Project : $PROJECT_DIR"
    echo "Ticket  : ${TICKET:-<not provided>}"
    echo "Date    : $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "============================================"
    echo ""
}

gate_header() {
    local gate="$1" label="$2"
    if $JSON_MODE; then return; fi
    echo -n "[Gate $gate] $label... "
}

gate_result() {
    local gate="$1" result="$2" detail="${3:-}"
    GATE_RESULTS[$gate]="$result"
    GATE_DETAILS[$gate]="$detail"
    if $JSON_MODE; then return; fi
    case "$result" in
        PASS)  echo -e "$PASS" ;;
        FAIL)  echo -e "$FAIL" ;;
        BLOCKED) echo -e "$BLOCKED" ;;
    esac
    if [ -n "$detail" ] && [ "$result" != "PASS" ]; then
        echo "         $detail"
    fi
}

# ── G1: TypeScript Compilation ───────────────────────────────────────────
gate_1() {
    gate_header 1 "TypeScript compilation"
    local all_pass=true
    local errors=""

    # Check server
    cd "$PROJECT_DIR/server"
    local server_output
    server_output=$(npx tsc --noEmit 2>&1) && local server_rc=$? || server_rc=$?
    if [ "$server_rc" -ne 0 ]; then
        all_pass=false
        local stripped
        stripped=$(echo "$server_output" | sed 's/\x1b\[[0-9;]*m//g' | grep -v '^\s*$' | tail -3 | tr '\n' ' ' | cut -c1-150)
        errors="$errors [server] $stripped"
    fi

    # Check client
    cd "$PROJECT_DIR/client"
    local client_output
    client_output=$(npx tsc --noEmit 2>&1) && local client_rc=$? || client_rc=$?
    if [ "$client_rc" -ne 0 ]; then
        all_pass=false
        local stripped
        stripped=$(echo "$client_output" | sed 's/\x1b\[[0-9;]*m//g' | grep -v '^\s*$' | tail -3 | tr '\n' ' ' | cut -c1-150)
        errors="$errors [client] $stripped"
    fi

    if $all_pass; then
        gate_result 1 "PASS" "server + client"
    else
        FAILURES=$((FAILURES + 1))
        gate_result 1 "FAIL" "$errors"
    fi
}

# ── G2: Test Execution ───────────────────────────────────────────────────
gate_2() {
    gate_header 2 "Test execution"
    cd "$PROJECT_DIR"
    local output
    output=$(npm test 2>&1) && local rc=$? || rc=$?
    if [ "$rc" -eq 0 ]; then
        # Count passed/failed from vitest output
        local passed tests
        passed=$(echo "$output" | strip_ansi | grep -oE 'Tests\s+[0-9]+ passed' | grep -oE '[0-9]+' | head -1 || echo "?")
        tests=$(echo "$output" | strip_ansi | grep -oE 'Tests\s+[0-9]+ passed \([0-9]+\)' | grep -oE '\([0-9]+\)' | grep -oE '[0-9]+' | head -1 || echo "?")
        [ -z "$passed" ] && passed="?"
        [ -z "$tests" ] && tests="?"
        gate_result 2 "PASS" "Tests: $passed/$tests passed, all passing"
    else
        FAILURES=$((FAILURES + 1))
        local summary
        summary=$(echo "$output" | strip_ansi | grep -E '(FAIL|failed|Error)' | head -3 | tr '\n' ' ' | cut -c1-200)
        gate_result 2 "FAIL" "$summary"
    fi
}

# ── G3: Test Coverage of Changed Files ───────────────────────────────────
gate_3() {
    gate_header 3 "Test coverage of changed files"
    cd "$PROJECT_DIR"

    local CHANGED_TS
    CHANGED_TS=$(git diff --name-only HEAD 2>/dev/null | grep '\.ts$' | grep -v '\.test\.ts$' | grep -v '\.spec\.ts$' | grep -v '__tests__' | grep -v 'node_modules' | grep -v '\.d\.ts$' || true)

    if [ -z "$CHANGED_TS" ]; then
        gate_result 3 "PASS" "no changed .ts files"
        return
    fi

    local UNTESTED_COUNT=0
    local UNTESTED_LIST=""
    while IFS= read -r file; do
        [ -z "$file" ] && continue
        local found=false
        for candidate in \
            "$(echo "$file" | sed 's/\.ts$/.test.ts/')" \
            "$(echo "$file" | sed 's/\.ts$/.spec.ts/')" \
            "$(echo "$file" | sed 's|/src/|/src/__tests__/|' | sed 's/\.ts$/.test.ts/')"; do
            if [ -f "$candidate" ]; then found=true; break; fi
        done
        if ! $found; then
            UNTESTED_COUNT=$((UNTESTED_COUNT + 1))
            UNTESTED_LIST="$UNTESTED_LIST $file"
        fi
    done <<< "$CHANGED_TS"

    if [ "$UNTESTED_COUNT" -eq 0 ]; then
        local total
        total=$(echo "$CHANGED_TS" | wc -l)
        gate_result 3 "PASS" "$total files, all covered"
    else
        # Check if mission ticket documents TD tickets for untested files
        local has_td_tickets=false
        if [ -n "$TICKET" ] && [ -f "$TICKET" ]; then
            if grep -qE 'TD-[0-9]{3}' "$TICKET" 2>/dev/null; then
                has_td_tickets=true
            fi
        fi

        if $has_td_tickets; then
            gate_result 3 "PASS" "$UNTESTED_COUNT untested file(s), TD ticket(s) referenced"
        else
            FAILURES=$((FAILURES + 1))
            gate_result 3 "FAIL" "$UNTESTED_COUNT untested file(s):$UNTESTED_LIST (no TD ticket)"
        fi
    fi
}

# ── G4: Git Working Tree Clean ───────────────────────────────────────────
gate_4() {
    gate_header 4 "Git working tree clean"
    cd "$PROJECT_DIR"
    if git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
        gate_result 4 "PASS" ""
    else
        FAILURES=$((FAILURES + 1))
        local status
        status=$(git status --short 2>/dev/null | head -10 | tr '\n' ' ')
        gate_result 4 "FAIL" "uncommitted: $status"
    fi
}

# ── G5: Mission Resolution Section ───────────────────────────────────────
gate_5() {
    gate_header 5 "Resolution section in ticket"
    if [ -z "$TICKET" ]; then
        FAILURES=$((FAILURES + 1))
        gate_result 5 "FAIL" "no ticket path provided"
        return
    fi
    if [ ! -f "$TICKET" ]; then
        FAILURES=$((FAILURES + 1))
        gate_result 5 "FAIL" "ticket file not found: $TICKET"
        return
    fi
    if grep -q "^## Resolution" "$TICKET"; then
        gate_result 5 "PASS" ""
    else
        FAILURES=$((FAILURES + 1))
        gate_result 5 "FAIL" "## Resolution section missing"
    fi
}

# ── G6: Remaining Technical Debt ─────────────────────────────────────────
gate_6() {
    gate_header 6 "Remaining Technical Debt documented"
    if [ -z "$TICKET" ] || [ ! -f "$TICKET" ]; then
        BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
        gate_result 6 "BLOCKED" "ticket not found — cannot verify debt documentation"
        return
    fi

    if ! grep -q "Remaining Technical Debt" "$TICKET"; then
        FAILURES=$((FAILURES + 1))
        gate_result 6 "FAIL" "### Remaining Technical Debt subsection missing"
        return
    fi

    # Check subsection is non-empty (has content lines)
    local debt_content
    debt_content=$(sed -n '/Remaining Technical Debt/,/^##/p' "$TICKET" \
        | grep -v "^##" | grep -v "Remaining" | grep -v "^$" | grep -v "^---$" | grep -v "^###" | grep -cv "^\s*$" || true)

    if [ "${debt_content:-0}" -gt 0 ]; then
        gate_result 6 "PASS" "$debt_content debt item(s) documented"
    else
        FAILURES=$((FAILURES + 1))
        gate_result 6 "FAIL" "debt subsection exists but is empty — requires items or explicit 'None' statement"
    fi
}

# ── G7: Manual Application Test Evidence ─────────────────────────────────
gate_7() {
    gate_header 7 "Manual application test evidence"
    if [ -z "$TICKET" ] || [ ! -f "$TICKET" ]; then
        BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
        gate_result 7 "BLOCKED" "ticket not found — cannot verify manual test evidence"
        return
    fi

    # Must have evidence of both: app start AND flow walkthrough
    local has_app_start=false
    local has_flow_test=false

    if grep -qiE "(dev server|app started|localhost:300|browser|manual test)" "$TICKET"; then
        has_app_start=true
    fi
    if grep -qiE "(teacher flow|student flow|walked through|flows tested|tested.*flow)" "$TICKET"; then
        has_flow_test=true
    fi

    if $has_app_start && $has_flow_test; then
        gate_result 7 "PASS" "app start + flow walkthrough documented"
    elif $has_app_start; then
        BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
        gate_result 7 "BLOCKED" "app start documented but flow walkthrough evidence missing"
    elif $has_flow_test; then
        BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
        gate_result 7 "BLOCKED" "flow walkthrough documented but app start evidence missing"
    else
        BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
        gate_result 7 "BLOCKED" "no manual test evidence in ticket — dev server start + flow walkthrough required"
    fi
}

# ── G8: Cross-Route Regression Check ─────────────────────────────────────
gate_8() {
    gate_header 8 "Cross-route regression check"
    if [ -z "$TICKET" ] || [ ! -f "$TICKET" ]; then
        BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
        gate_result 8 "BLOCKED" "ticket not found — cannot verify regression check"
        return
    fi

    if grep -qiE "(regression|consumers checked|cross.route|all compil|no shared)" "$TICKET"; then
        gate_result 8 "PASS" "regression evidence found"
    else
        BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
        gate_result 8 "BLOCKED" "no regression check evidence — verify shared util consumers and document"
    fi
}

# ── G9: Anti-Bypass Integrity ────────────────────────────────────────────
gate_9() {
    gate_header 9 "Anti-bypass integrity"
    if [ -z "$TICKET" ] || [ ! -f "$TICKET" ]; then
        BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
        gate_result 9 "BLOCKED" "ticket not found — anti-bypass check requires ticket"
        return
    fi

    # Count how many evidence types are present in the ticket
    local evidence_score=0
    grep -qiE "(npx tsc|tsc --noEmit|TypeScript.*compil|compiles? clean)" "$TICKET" && evidence_score=$((evidence_score + 1))
    grep -qiE "(tests?.*pass|vitest|test suite|all.*passing)" "$TICKET" && evidence_score=$((evidence_score + 1))
    grep -qiE "(coverage|TD-[0-9]{3}|test.*exercise.*changed)" "$TICKET" && evidence_score=$((evidence_score + 1))
    grep -qiE "(git.*commit|commit.*hash|committed)" "$TICKET" && evidence_score=$((evidence_score + 1))
    grep -qiE "(manual test|browser|dev server|walked through)" "$TICKET" && evidence_score=$((evidence_score + 1))
    grep -qiE "(debt|TD-[0-9]{3}|remaining|documented)" "$TICKET" && evidence_score=$((evidence_score + 1))
    grep -qiE "(regression|consumers|all compil)" "$TICKET" && evidence_score=$((evidence_score + 1))

    if [ "$evidence_score" -ge 4 ]; then
        gate_result 9 "PASS" "evidence score: $evidence_score/7 — sufficient documented evidence"
    elif [ "$evidence_score" -ge 2 ]; then
        BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
        gate_result 9 "BLOCKED" "evidence score: $evidence_score/7 — insufficient documented evidence, do not bypass"
    else
        BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
        gate_result 9 "BLOCKED" "evidence score: $evidence_score/7 — critical lack of evidence, mission cannot close"
    fi
}

# ── Summary ───────────────────────────────────────────────────────────────
summary() {
    if $JSON_MODE; then
        json_output
        return
    fi

    echo ""
    echo "============================================"
    echo " Gate Summary"
    echo "============================================"
    for i in $(seq 1 9); do
        local result="${GATE_RESULTS[$i]:-UNKNOWN}"
        local detail="${GATE_DETAILS[$i]:-}"
        local label=""
        case "$result" in
            PASS)   label="${GREEN}PASS${NC}" ;;
            FAIL)   label="${RED}FAIL${NC}" ;;
            BLOCKED) label="${RED}BLOCKED${NC}" ;;
            *)      label="${YELLOW}$result${NC}" ;;
        esac
        echo -e "  G${i}: $label  $detail"
    done

    echo ""
    echo "============================================"
    local total_issues=$((FAILURES + BLOCKED_COUNT))
    if [ "$total_issues" -eq 0 ]; then
        echo -e " ${GREEN}All 9 gates passed. Mission ready to close.${NC}"
        echo "============================================"
        return 0
    else
        echo -e " ${RED}${FAILURES} FAILED, ${BLOCKED_COUNT} BLOCKED.${NC}"
        echo ""
        if [ "$BLOCKED_COUNT" -gt 0 ]; then
            echo -e " ${RED}BLOCKED gates indicate missing evidence.${NC}"
            echo " BLOCKED is not WARN — it is a hard stop."
            echo " You must document evidence in the ticket Resolution section."
        fi
        if [ "$FAILURES" -gt 0 ]; then
            echo " Fix failures before re-running validator."
        fi
        echo "============================================"
        return 1
    fi
}

# ── Main ──────────────────────────────────────────────────────────────────
header
gate_1
gate_2
gate_3
gate_4
gate_5
gate_6
gate_7
gate_8
gate_9
summary
exit $?
