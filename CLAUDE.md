# MyAdvocate — CLAUDE.md
## Engineering Operator Layer

> Read SYSTEM.md first. This file governs how to build; SYSTEM.md governs what to build and
> what is never permitted. When they conflict, SYSTEM.md wins.

---

## Current Status
**Phase 1 MVP: SHIPPED** (as of 2026-03-10)
- Core product live on Vercel
- Insurance denial decoder, appeal generator, medical bill dispute, HIPAA records request — all functional
- Supabase DB + Stripe billing + Anthropic API integrated
- 37 commits, all Phase 1 acceptance criteria met

**Now in Phase 2:** Content engine, SEO growth, automation pipeline

---

## Why
AI-powered patient advocacy platform. Helps people navigate insurance denials and medical billing disputes.

---

## Default Stack

| Layer | Tool | Notes |
|---|---|---|
| Frontend / App | Next.js 14 (App Router) | Vercel deployment |
| Database | Supabase (Postgres + RLS) | Service role for server; anon for client |
| Auth | Supabase Auth | |
| Payments | Stripe | Webhooks via `/api/webhooks/stripe` |
| Email / Newsletter | Beehiiv | Phase 2 — newsletter capture + distribution |
| Automation | n8n | Phase 2 — event-driven automation, webhook routing, retention flows |
| AI Provider | Anthropic (`claude-sonnet-4-6`) | All calls via `generateLetter()` abstraction |
| Rate limiting | Upstash Redis | |

**Provider abstraction rule:** All Anthropic API calls must go through `src/lib/generate-letter.ts`.
Never call the Anthropic SDK directly from page or component code. This is the single routing
boundary for scrubber enforcement, model selection, caching, and output normalization.

---

## Repo Map
- `src/app/` — Next.js App Router pages and API routes
  - `src/app/api/` — API routes: `admin/`, `cases/`, `denial-lookup/`, `documents/`, `generate/`, `stripe/`
  - `src/app/tools/denial-decoder/` — denial decoder tool page
  - `src/app/intake/`, `auth/`, `denial-codes/`, `resources/`, `admin/review/`
- `src/lib/` — core utilities
  - `db/` — 10 domain helpers: artifacts, cases, denial-codes, documents, extraction-outputs, metric-events, resource-routes, review-queue, subscriptions, users
  - `supabase/` — `client.ts` (anon/browser), `server.ts` (service role)
  - `auth.ts`, `stripe.ts`, `rate-limit.ts`, `parse-document.ts`
  - `generate-letter.ts` — single Anthropic call boundary (never bypass)
  - `pii-scrubber.ts` — must run before every API call
  - `disclaimer.ts` — appended to all user-facing outputs
- `src/types/` — `domain.ts` (shared enums/interfaces), `supabase.ts` (generated DB types)
- `src/components/` — shared UI: Button, Input, FormField, Card, Alert, Nav
- `supabase/migrations/` — 11 migrations, append-only (see `supabase/migrations/CLAUDE.md`)
- `supabase/seed/` — seed data for denial codes and resource routes
- `docs/` — `security-audit-session-9.md` and ad-hoc session notes
- `automation/daily.js` — Notion sync automation (see Automation section below)
- `.claude/skills/` — 32 Claude skill definitions (see Skills System below)
- `.claude/hooks/` — Claude Code guardrail hooks
- `scripts/` — dev tooling (git hooks installer)

---

## Rules

### Core Invariants (never violate)
- NEVER skip PII scrubbing before Anthropic API calls — see `src/lib/pii-scrubber.ts`
- NEVER call the Anthropic SDK directly — always use `generateLetter()` abstraction
- NEVER auto-release artifacts — `release_state` must pass through `review_required`
- NEVER add freeform text fields to the Case object
- NEVER commit `.env` files
- NEVER edit past migrations — create a new one with `supabase migration new <name>`

### Scope Gates
- Check MA-LCH-004 before building any new feature (Phase 1 scope boundary)
- Check MA-SEC-002 before any feature touching user data (20 controls, all must PASS)
- Check Parking Lot in Notion before adding infrastructure that has a deferred phase tag

### Model String
The correct Anthropic model string is **`claude-sonnet-4-6`** (not `claude-sonnet-4-20250514` or any older string).

---

## Engineering Checklist

Before building any new feature or making an architectural change, run through these six steps:

1. **Mission/safety check** — Does this conflict with any rule in SYSTEM.md? If yes, stop.
2. **Phase/architecture check** — Is this feature phase-gated? Is it in the Parking Lot? If yes, get explicit unlock confirmation before proceeding.
3. **Extend existing abstractions** — Can this be built by extending `generateLetter()`, `pii-scrubber`, or existing skill logic rather than adding new infrastructure?
4. **Specify data flow** — Map exactly which fields enter the API, which are stored, and which are discarded. No field should be stored that isn't required by the output.
5. **Call out testing and migration** — If touching `src/lib/`, tests run automatically (hook). If adding a DB field, write a new migration.
6. **Document cost and lock-in risk** — If adding a new vendor or model call, note the cost tier and whether there's a viable alternative if the vendor disappears.

---

## Key Commands
- `npm run dev` — start dev server
- `npm test` — run tests (Vitest)
- `npm run lint` — ESLint check
- `supabase start` — start local Supabase (requires Docker)
- `supabase db push` — apply migrations
- `supabase gen types typescript --local > src/types/supabase.ts` — regenerate types
- `bash scripts/install-hooks.sh` — install git pre-commit hook (run once after clone)

---

## Canonical Docs
- `SYSTEM.md` — constitutional layer (mission, ethics, legal, privacy) — read first
- MA-LCH-004 — Launch Truth (what ships in Phase 1)
- MA-SEC-002 — Security Checklist (20 controls, all must PASS)
- MA-DAT-002 — Data Model (10 objects, minimum fields)
- `docs/security-audit-session-9.md` — security audit session notes
- `supabase/migrations/CLAUDE.md` — migration rules (append-only, never edit past migrations)

---

## Claude Skills System

All 32 MyAdvocate skills live in `.claude/skills/<skill-name>/SKILL.md`.

**Invoke the master operator for high-level questions:**
- "How is the business doing?" → `myadvocate-master-operator`
- "What should I focus on this week?" → `myadvocate-master-operator`
- "Generate an appeal letter for this denial" → `insurance-appeal-generator`
- "Help me negotiate my bill" → `negotiation-script-generator`

**Skill categories:**

| Category | Skills |
|---|---|
| Product | insurance-denial-decoder, insurance-appeal-generator, medical-bill-dispute-generator, negotiation-script-generator, state-health-rights-summary, ombudsman-complaint-generator, medical-record-request-generator |
| Workflow | document-upload-analysis, appeal-strategy-generator, legal-citation-engine, document-quality-checker |
| Infrastructure | seo-topic-research, seo-article-generator, content-library-auditor, traffic-analytics, content-cluster-builder |
| Founder Intelligence | weekly-operations-planner, monthly-performance-review, capital-reserve-monitor, gamification-xp-engine |
| Governance | pii-sanitizer, legal-disclaimer-enforcer, medical-accuracy-checker |
| Automation | content-production-orchestrator, ranking-monitor, content-refresh-engine |
| Publishing | social-post-generator, newsletter-generator, video-script-generator |
| Book | book-outline-generator, book-chapter-writer |
| Orchestration | myadvocate-master-operator |

**Governance rule:** `pii-sanitizer` MUST be invoked before any Anthropic API call. `legal-disclaimer-enforcer` MUST be invoked before any user-facing document delivery. `document-quality-checker` runs the compliance scan (forbidden determinations check) before every document is returned to the user.

---

## Guardrail Hooks

Configured in `.claude/settings.json`:

| Hook | Trigger | Action |
|---|---|---|
| `guard-migrations.sh` | PreToolUse: Edit/Write on `supabase/migrations/` | Blocks edit, explains new migration workflow |
| `run-lib-tests.sh` | PostToolUse: Edit/Write on `src/lib/` | Runs `npm test` automatically |

Git pre-commit hook (`scripts/pre-commit`): runs ESLint on staged `.ts/.tsx/.js/.jsx` files before each commit. Automatically excludes `automation/` and `scripts/` (which are in ESLint's ignore list) to prevent false-positive warnings. Install with `bash scripts/install-hooks.sh`.

---

## Automation

### daily.js (`automation/daily.js`)
Syncs Notion tasks into Supabase, generates a daily digest via Claude, logs run results.
- Reads all keys from `.env` — no hardcoded credentials
- Uses `claude-sonnet-4-6` model string
- Supports one-shot (`node automation/daily.js`) and cron mode (`DAILY_RUN=cron node automation/daily.js`)
- See `automation/README.md` for full setup instructions

---

## Phase 2 Priorities (Current)
1. `src/components/` shared UI library — ✅ Done (Button, Input, FormField, Card, Alert, Nav)
2. `daily.js` automation — ✅ Done (rebuilt with correct model string, env vars, error handling)
3. Launch SEO content engine (target: 20 articles in 60 days)
4. Activate content-production-orchestrator pipeline
5. Beehiiv integration for newsletter capture
6. n8n automation setup (event routing, retention flows)

---

## Staleness Policy
This file should be reviewed whenever:
- A new Phase begins (Phase 2 → 3, etc.)
- A new canonical doc is added to `docs/superpowers/`
- The default stack changes (new vendor, new model string)
- The automation setup changes
- A new skill category is added to `.claude/skills/`

Last reviewed: **2026-03-11**

### Recent Changes
- 2026-03-11: Fixed pre-commit hook — `automation/` and `scripts/` now excluded from ESLint staged-file check to match `eslint.config.mjs` ignore patterns.
- 2026-03-11: Updated Repo Map to reflect actual `src/lib/` structure, API routes, and `src/types/`. Removed phantom `docs/superpowers/` reference. Updated commit count to 37.
