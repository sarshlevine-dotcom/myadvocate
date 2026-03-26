# CLAUDE.md — MyAdvocate Repo Guide

> **Who reads this:** Claude Cowork, OpenHands, and any AI system working inside this repo.
> **Authority:** Subordinate to MA-PMP-001 → MA-ARC-001. This file governs workflow and priorities. It does not override strategic doctrine.

---

## Role Boundaries

### Claude Cowork (this session)
- **Does:** Normalizes docs, writes OpenHands task specs, produces canonical docs, validates schemas against specs, sequences build priorities, generates founder briefs.
- **Does not:** Generate primary content at scale, make architecture decisions, merge code, run automation workflows.

### OpenHands
- **Does:** Implements scoped features from structured task specs, patches bounded bugs, writes tests, creates migrations, builds admin/internal pages.
- **Does not:** Decide architecture, merge to main, alter canonical functions autonomously, touch billing/privacy/YMYL logic autonomously.

### n8n
- **Does:** Runs 7 Phase 1 automation workflows (content intake, draft gen, review routing, publish prep, metrics logging, Spanish candidate trigger, packaging trigger).
- **Does not:** Replace human review gates or YMYL sign-off.

---

## Core Invariants — Never Violate

These apply to ALL AI systems working in this repo:

1. **Never skip PII scrubbing** — `pii-scrubber.ts` runs before every Anthropic call
2. **Never call Anthropic SDK directly** — always route through `src/lib/generate-letter.ts`
3. **Never auto-release artifacts** — `release_state` must pass through `review_required`
4. **Never add freeform text fields** to the Case object
5. **Never edit past Supabase migrations** — run `supabase migration new <name>` to create a new one
6. **Never bypass the 7-gate chain** on `generateLetter()` — Gates 1–7 must run in sequence
7. **Never call Anthropic SDK from page or component code** — the 7-gate chain lives inside `generate-letter.ts` only
8. **Never render a letter from raw model output** — always parse through `LetterOutputSchema` first
9. **Never publish YMYL content** without Kate clinical sign-off
10. **Never publish trust pages** without attorney review sign-off
11. **Never publish a page** without schema-level internal linking hardwired at build time
12. **Never commit `.env` files**
13. **Model string:** `claude-sonnet-4-6` — use this exact string, no variants

---

## Repo Map

```
src/app/              — Next.js App Router pages and API routes
  api/                — admin/, cases/, denial-lookup/, documents/, generate/, stripe/
  tools/              — denial-decoder/, intake/, auth/, denial-codes/, resources/
  admin/              — Founder-only dashboard (auth required)
src/lib/              — Core utilities
  generate-letter.ts  — SINGLE Anthropic call boundary — never bypass
  pii-scrubber.ts     — Runs before every API call — never skip
  disclaimer.ts       — Appended to all user-facing outputs
  db/                 — 10 domain helpers (artifacts, cases, denial-codes, etc.)
  supabase/           — client.ts (anon/browser), server.ts (service role)
src/components/       — Button, Input, FormField, Card, Alert, Nav
src/types/            — domain.ts, supabase.ts (generated)
supabase/migrations/  — Append-only. Never edit past migrations.
context_registry/     — 8 JSON files (MA-CTX-001): denial codes, clusters, pages
docs/                 — pmp/ · agents/ · memory/ · seo/ · social/ · context/ · dev/
.claude/skills/       — 32 skill definitions
.claude/hooks/        — Guardrail hooks
automation/           — daily.js (Notion sync + Claude digest)
```

---

## OpenHands Task Spec Format

Every OpenHands task MUST use this format. Claude Cowork writes specs; OpenHands executes them.

```
TASK: [one-sentence objective]
CONTEXT: [why this exists, what system it touches]
FILES: [specific files/dirs to touch — be precise]
CONSTRAINTS: [what NOT to change]
ACCEPTANCE CRITERIA: [how to know it's done — testable]
RISK CLASS: [low / medium / high]
REVIEWER REQUIRED: [yes / no]
```

**Risk class guidance:**
- Low: tests, lint, dependency updates, internal tooling, non-sensitive migrations
- Medium: new routes, new DB tables, new components
- High: any touch of generate-letter.ts, trackedExecution(), auth, billing, PII scrubber

High-risk tasks require founder review before merge. No exceptions.

---

## First 10 OpenHands Tasks (Priority Order)

1. Enforce `trackedExecution()` on all canonical functions — RISK: medium
2. Add regression test for `trackedExecution()` enforcement — RISK: low
3. Security Checklist code-side fixes — RISK: medium
4. Upload/parsing hardening (unsupported file types, 10MB limit) — RISK: low
5. Stripe test mode activation — RISK: medium
6. Denial-code schema + import scaffold (`denial_codes` table) — RISK: medium
7. Content validation script — RISK: low
8. Regression tests for founder review queue — RISK: low
9. Unsupported-file-type handling improvements — RISK: low
10. Denial-code publishing pipeline — RISK: medium

---

## Database Tables

### Operational (8) — user-facing execution system
`requests` · `executions` · `outputs` · `outcomes` · `revenue_records` · `sessions` · `api_credentials` · `agents`

### Content Production (9) — content flywheel
`content_items` · `content_variants` · `content_metrics` · `packaging_assets` · `packaging_asset_items` · `tasks` · `task_runs` · `denial_codes` · `prompt_templates`

### Caching (3)
`cache_entries` · `cache_logs` · `cache_promotions`

### Proposed Migrations (pending Sprint assignment)
- **018:** `letter_quality_evaluations` — LQE 3-gate results
- **019:** `agent_execution_logs` — G3 stopping condition enforcement
- **020:** `denial_intelligence_events` — TIMS denial pattern clustering

---

## Key Commands

```bash
npm run dev           # Start dev server
npm test              # Vitest
npm run lint          # ESLint
supabase start        # Local Supabase (requires Docker)
supabase db push      # Apply migrations
bash scripts/install-hooks.sh  # Install pre-commit hook (run once)
```

---

## Governance Chain

```
MA-PMP-001 (what's allowed)
  → Founder (what to work on)
    → Claude Cowork (writes task spec)
      → OpenHands (codes the task)
        → PR (no direct merge to main)
          → Founder review
            → Merge
```

**Version:** Aligned with MA-PMP-001 v31 · March 26, 2026
