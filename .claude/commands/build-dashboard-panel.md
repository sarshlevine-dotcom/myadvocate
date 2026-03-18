# /build-dashboard-panel

Builds a single owner reporting panel for the Google Sheets workbook (interim) or React dashboard (Phase 3+ only).

## Usage
/build-dashboard-panel [panel name]

## Context
Owner reporting is Google Sheets until the Phase 3 unlock gate is crossed (Level 6 XP + $5,000 MRR).
Do NOT build a custom React dashboard panel unless the Phase 3 gate has been explicitly crossed.
For Google Sheets panels, produce the sheet structure. For the future React build, produce the component spec.

## Output Format

### Panel: [name]

**Reporting layer:** Google Sheets tab / React component (Phase 3+ only)

**Tab/Component name:** [exact name]

**Purpose:** One sentence — what decision does this panel support?

**Data source:**
- Where does the data come from? (Stripe, n8n webhook, Langfuse export, Anthropic dashboard, Google Search Console, manual MPR entry)
- Update frequency: real-time / daily / weekly / monthly (MPR)

**Google Sheets structure (interim):**
- Column headers and data types
- Any formulas required (scenario comparison, % calculations, conditional formatting rules)
- Color coding: Green = on track, Yellow = monitor, Red = divergence >20%

**React component spec (Phase 3+ only — do not build until gate crossed):**
- Props with types
- Data states: loading / error / empty / populated
- QA checklist before merge

**Privacy rule:**
- This panel reads aggregated metrics only. It must never display individual user records, names, emails, or case content.
- Confirm: no Supabase query returns user-level PII to this panel.

**Linked metric:**
- Which PMP §13 tab does this map to?
- Which signal gate does this unlock (if any)?

---
## MyAdvocate Rules This Command Enforces
- No custom React dashboard until Phase 3 gate (Level 6 XP + $5,000 MRR)
- Owner reporting reads aggregated metrics only — never user records
- Every panel maps to a decision, not a vanity metric
- Google Sheets is the current and only owner reporting layer
