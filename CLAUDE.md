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

**Now in Phase 2:** Content engine, SEO growth, automation pipeline, context registry scaffolding, patient story engine pre-launch setup, external agent deployment

**⚠️ Retroactive LAUNCH GAPS (MA-AUT-006 v2):** G1 (LQE evaluator) and G6 (7-gate chain) were identified as launch blockers but shipped without implementation. These must be addressed in Phase 2 Sprint 1 before any AI output reaches users without Kate review.

**⚠️ Additional launch gaps (Supplemental Audit 2026-03-13):** Server-side tier authorization, free-tier generation limits, and YMYL review operating model (MA-SEC-002 P25–P27) must be implemented before public traffic. Prompt versioning, backup restoration test, and incident response runbook (P28–P30) must be complete before Signal 1. Document upload **deferred to Phase 2** — NER-grade PII redaction + malware scanning required before re-enabling.

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
| Email (Transactional / Ops) | Google Workspace | admin@getmyadvocate.org — verified ✅ |
| Email / Newsletter | Beehiiv | Phase 2 — newsletter capture + distribution |
| Automation | n8n | Phase 2 — event-driven automation, webhook routing, retention flows |
| AI Provider | Anthropic | All calls via `generateLetter()` — Haiku default, Sonnet for complex/doc cases |
| Caching / Rate limiting | Upstash Redis | Rate limiting live; response caching deferred to Phase 2 |

**Provider abstraction rule:** All Anthropic API calls must go through `src/lib/generate-letter.ts`.
Never call the Anthropic SDK directly from page or component code. This is the single routing
boundary for scrubber enforcement, model selection, output caps, cost logging, and budget tripwires.

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
  - `generate-letter.ts` — single Anthropic call boundary (never bypass); contains model routing, output caps, and cost logging
  - `budget-monitor.ts` — Redis-based API spend tracking and tripwire alerts (MA-COST-001)
  - `pii-scrubber.ts` — must run before every API call
  - `disclaimer.ts` — appended to all user-facing outputs
- `src/types/` — `domain.ts` (shared enums/interfaces incl. `ModelTier`), `supabase.ts` (generated DB types)
- `src/components/` — shared UI: Button, Input, FormField, Card, Alert, Nav
- `supabase/migrations/` — 15 migrations (016 pending for scrub_records), append-only (see `supabase/migrations/CLAUDE.md`)
- `supabase/seed/` — seed data for denial codes and resource routes
- `context_registry/` — Phase 1 agent intelligence layer (MA-CTX-001): 8 JSON registries. NOT a database — lightweight JSON files. See Section "Context Registry" below.
- `docs/` — organized by subdomain (see Docs Structure below)
- `automation/daily.js` — Notion sync automation (see Automation section below)
- `.claude/skills/` — 32 Claude skill definitions (see Skills System below)
- `.claude/agents/` — External agent .md files (MA-AGT-001). See Agent System below.
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
- NEVER use Sonnet as the default model — Haiku is the default; Sonnet requires explicit justification (see MA-COST-001)
- NEVER publish SEO content before all 7 trust infrastructure pages are live and attorney-reviewed (MA-EEAT-001 §5.1 — launch blocker)
- NEVER describe the clinical reviewer as RN — correct framing is LPN/LVN with 20+ years and nursing management experience (see MA-EEAT-001 §3.2)
- NEVER let a content page enter the human review queue without passing the 5-layer automated EEAT safety stack (MA-EEAT-001 §8.1)
- NEVER publish cluster pages before the parent cornerstone is live and indexed — violating this wastes authority signal and fragments topical trust (MA-SEO-SUP-001 §1)
- NEVER publish content without GEO template compliance: direct-answer block within first 200 words, H2 question headers, FAQPage/HowTo/Article schema markup — this is a Phase 1 standard, not optional (MA-SEO-SUP-001 §9)
- NEVER reference founders (Sarsh or Kate) by name in any public-facing content — always use institutional voice: "the MyAdvocate team", "our editorial board", "our licensed healthcare reviewer" (MA-SEO-SUP-001 §2)
- NEVER publish new cluster pages in a cluster where any existing page has refresh_priority_score > 70 — refresh-before-expand rule applies in Phase 4 (MA-SEO-SUP-001 §6)
- NEVER modify `generateLetter()` without running it through the 7-gate chain spec (G6) — all 7 gates must pass before any output reaches users; gate failures must halt execution (MA-AUT-006 §G6)
- NEVER allow AI letter output to bypass the Letter Quality Evaluator (G1/LQE) — three sequential checks (denial code accuracy, YMYL safety, legal framing) must all PASS; failures route to Kate review queue with failure_reason logged (MA-AUT-006 §G1)
- NEVER publish Spanish content (video scripts or web pages) before the Spanish Content Audit Agent (G7/SCAA) is operational — Month 9 YouTube gate; Month 12 web gate (MA-AUT-006 §G7)
- NEVER deploy a new agent without defined stopping conditions: max retries, timeout ceiling, explicit failure state action — see stopping conditions table in MA-AUT-006 §G3
- NEVER invoke `generateLetter()` without first running `checkTierAuthorization(userId, letterType)` server-side — free-tier limits and subscription entitlements must be verified at the API layer before generation proceeds (MA-SEC-002 P25/P26)
- NEVER enable document upload without both malware scanning (VirusTotal API or equivalent) and NER-grade PII redaction (AWS Comprehend Medical or Azure Health NLP) — regex scrubbing is insufficient for insurance documents; upload is deferred to Phase 2 (MA-SEC-002 P22, Supplemental Audit 2026-03-13)
- NEVER create an artifact without storing `prompt_version_hash` — SHA-256 of prompt template + model string + disclaimer version, captured at generation time (MA-SEC-002 P30)

### Scope Gates
- Check MA-LCH-004 before building any new feature (Phase 1 scope boundary)
- Check MA-SEC-002 before any feature touching user data (24 controls, all must PASS)
- Check MA-COST-001 before any new AI call site — classify as Bucket 1/2/3 first
- Check MA-EEAT-001 before designing any content workflow, reviewer system, or trust infrastructure page
- Check MA-SEO-SUP-001 before designing any SEO content cluster, cornerstone guide, refresh system, content tier classification, or GEO template — this document is the operating doctrine for all content infrastructure decisions
- Check MA-AUT-006 before any modification to `generateLetter()`, any new agent deployment, or any change to the letter quality pipeline — G1/G6 are retroactive launch gaps that must be cleared; G4/G5 are signal-gated and must not be pulled forward
- Check Parking Lot in Notion before adding infrastructure that has a deferred phase tag

### Model Strings
| Tier | String | When to use |
|---|---|---|
| Haiku (default) | `claude-haiku-4-5-20251001` | All standard letter types without document upload |
| Sonnet (reserved) | `claude-sonnet-4-6` | Document upload present; complex/ambiguous cases only |

Model routing is enforced in `MODEL_ROUTER` in `generate-letter.ts`. Do not hard-code model
strings anywhere else. Do not use Sonnet "for quality" — only use it when the routing table
explicitly calls for it.

---

## Cost Architecture (MA-COST-001)

**Budget cap:** $150/month — enforced by `src/lib/budget-monitor.ts` via Redis tripwires.

**Output caps** (hard `max_tokens` limits in `OUTPUT_CONFIG`):
| Letter type | max_tokens |
|---|---|
| `denial_appeal` | 600 |
| `bill_dispute` | 500 |
| `hipaa_request` | 400 |
| `negotiation_script` | 200 |

**3-bucket rule for every AI call:**
- 🔴 **Bucket 1 (live AI):** Personalized outputs — denial/dispute/HIPAA/negotiation letters
- 🟡 **Bucket 2 (cache-first):** Rights summaries, standard next steps, common scripts — serve from Redis on repeat queries
- 🟢 **Bucket 3 (static/template):** Denial code lookups, resource pages, FAQ content — no AI, ever

**Before adding any new AI call site:** classify it into a bucket. If Bucket 2 or 3, do not call the API.

**Budget tripwire levels:** `ok` (0–50%) → `warning` (50–80%) → `review` (80–100%) → `throttle` (100%+)

Phase 2: replace console alerts with n8n webhook. See MA-COST-001 in Notion for full spec.

---

## Engineering Checklist

Before building any new feature or making an architectural change, run through these six steps:

1. **Mission/safety check** — Does this conflict with any rule in SYSTEM.md? If yes, stop.
2. **Phase/architecture check** — Is this feature phase-gated? Is it in the Parking Lot? If yes, get explicit unlock confirmation before proceeding.
3. **Extend existing abstractions** — Can this be built by extending `generateLetter()`, `pii-scrubber`, or existing skill logic rather than adding new infrastructure?
4. **Specify data flow** — Map exactly which fields enter the API, which are stored, and which are discarded. No field should be stored that isn't required by the output.
5. **Call out testing and migration** — If touching `src/lib/`, tests run automatically (hook). If adding a DB field, write a new migration.
6. **Document cost and lock-in risk** — Classify the AI call (Bucket 1/2/3). Note the model tier and justify if Sonnet. Note cost tier and viable alternatives if adding a new vendor.

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
- `MA-PMP-001` (PMP v24) — single source of truth for strategy, operations, financials — `docs/pmp/MyAdvocate_PMP_v24.docx`
- `MA-LCH-004` — Launch Truth (what ships in Phase 1)
- `MA-SEC-002` — Security Checklist (24 controls — 20 original + 4 AI content security controls)
- `MA-COST-001` — API Cost Architecture & Spend Control (model routing, output caps, budget tripwires)
- `MA-DAT-002` — Data Model (10 objects, minimum fields)
- `MA-CTX-001` — Context Registry Specification — governs `context_registry/` folder and all JSON registries
- `MA-SOC-002` — Patient Story Engine — dual-track sourcing, scrub protocol, rollout gates
- `MA-AGT-001` — External Agent Integration Plan — 11 agents (GEO-01/02/03, DEV-01/02/03, CNT-01, MKT-01/02/03, PRD-01)
- `MA-AUT-006` — Agent System Architecture Audit v2 — 7 gaps (G1–G7) grounded in Anthropic best practices; G1+G6 are retroactive launch blockers; G7 is the Spanish Content Audit Agent (SCAA) design; G4/G5 are Phase 2 signal-gated — `docs/agents/MA-AUT-006_Agent_System_Audit_v2.docx` ← hardwired into all generateLetter() modifications and agent deployments
- `Supplemental Security Audit` — 10 operational/security gaps, 6 new PassFail controls (P25–P30), 3 required founder decisions; YMYL review model formalized, doc upload deferred, prompt versioning + incident runbook specified — `docs/security/myadvocate_supplemental_audit_report.docx` + `docs/security/MA-SEC-002-additions-priorities-25-30.md`
- `Incident Response Runbook` — P1/P2/P3 severity definitions, response targets, P1 user notification template, key contacts — `docs/security/incident-response-runbook.md`
- `MA-YT-001` — YouTube & Spanish Channel Strategy — EN + ES channel model, phase cadence, QA pipeline — `docs/social/MA-YT-001_YouTube_Spanish_Strategy_Report.docx`
- `MA-IG-001` — Instagram Strategy v2.0 — gate structure, direct/indirect revenue model, EN + ES dual channel — `docs/social/MA-IG-001_Instagram_Strategy_v2.docx`
- `MA-EEAT-001` — EEAT & YMYL Compliance Audit — shortfall analysis, trust infrastructure spec, 5-layer content safety stack, reviewer framing, gamification Trust XP — `docs/seo/MA-EEAT-001_EEAT_YMYL_Audit_Report.docx` ← hardwired into all SEO content
- `MA-SEO-SUP-001` — SEO Authority & Content Infrastructure Strategy — 9-section operating doctrine: cornerstone library (10 guides, phased), anonymous trust infrastructure, editorial board attribution model, backlink program, policy interpretation cluster, content refresh formalization, Annual Outcomes Report, Spanish-language content, GEO hardwiring; agent deployment revisions and consolidated metrics dashboard — `docs/seo/MA-SEO-SUP-001_SEO_Authority_Content_Infrastructure_v1.docx` ← hardwired into all content infrastructure decisions
- `MA-AHP-001` — Anti-Hallucination Protocol — governs all agent outputs (in Notion Agent Registry)
- `MA-SUP-DAT-001` — Proprietary Data Engine Strategy — two compounding datasets (friction events + appeal outcomes), collection schema, publication gates, phase/sprint task plan, competitive moat analysis — `docs/data/myadvocate_business_supplemental_proprietary_data_engine_v1.docx` ← hardwired into data architecture and Phase 2+ data intelligence builds
- `Projections v17` — Financial model M1–M24, all revenue streams — `docs/pmp/MyAdvocate_Projections_v17.xlsx`
- `docs/security/security-audit-session-9.md` — security audit session notes
- `docs/security/MA-SEC-002-additions-priorities-21-24.md` — Priorities 21–24 to integrate into Google Drive doc
- `supabase/migrations/CLAUDE.md` — migration rules (append-only, never edit past migrations)

---

## Docs Structure
```
docs/
  cost/       MA-COST-001-api-cost-architecture.md
  security/   security-audit-session-9.md, MA-SEC-002-additions-priorities-21-24.md
              MA-SEC-002-additions-priorities-25-30.md  ← NEW 2026-03-13 — 6 new PassFail controls from supplemental audit
              myadvocate_supplemental_audit_report.docx  ← NEW 2026-03-13 — source supplemental audit
              incident-response-runbook.md  ← NEW 2026-03-13 — P1/P2/P3 runbook
  seo/        MA-EEAT-001_EEAT_YMYL_Audit_Report.docx  ← EEAT/YMYL compliance spec, hardwired into all content
              MA-SEO-001_90Day_Publishing_Queue.md
              MA-SEO-SUP-001_SEO_Authority_Content_Infrastructure_v1.docx  ← NEW in v24 — SEO operating doctrine, cornerstone library, GEO standard, content refresh, annual report
  pmp/        MyAdvocate_PMP_v18.docx, MyAdvocate_PMP_v19.docx, MyAdvocate_PMP_v21.docx, MyAdvocate_PMP_v22.docx, MyAdvocate_PMP_v23.docx, MyAdvocate_PMP_v24.docx  ← CURRENT
              MyAdvocate_Projections_v17.xlsx  ← CURRENT financial model (M1-M24, 3 scenarios)
  system/     claude-project-instructions.md
  superpowers/plans/
  agents/     MA-AGT-001 (External Agent Integration Plan)           ← NEW in v21
              MA-AUT-006_Agent_System_Audit_v2.docx                 ← NEW in v25 — agent architecture audit, 7 gaps, G1+G6 launch blockers
  context/    MA-CTX-001 (Context Registry Specification)            ← NEW in v21
  social/     MA-SOC-002 (Patient Story Engine)                      ← NEW in v21
              MA-YT-001_YouTube_Spanish_Strategy_Report.docx         ← NEW in v22
              MA-IG-001_Instagram_Strategy_v2.docx                   ← NEW in v22
  data/       MA-SUP-DAT-001 (Proprietary Data Engine Strategy)      ← NEW in v23
              myadvocate_business_supplemental_proprietary_data_engine_v1.docx
```

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

## YMYL Review Operating Model

**Defined 2026-03-13 per MA-SEC-002 P27 and Supplemental Audit Issue 1.**

| Parameter | Value |
|---|---|
| Primary reviewer | Kate (clinical — LPN/LVN) |
| Secondary / escalation | Sarsh (founder) |
| Delivery SLA to user | 24 hours from generation |
| Queue depth cap | 10 artifacts |
| On queue > 10 | Generation pauses; Sarsh alerted immediately |
| Kate unavailable | Escalate to Sarsh; SLA extends to 48 hours; user notified |
| Phase 1 notification | Supabase webhook → email (Google Workspace: admin@getmyadvocate.org) to Kate + Sarsh on every new artifact |
| Phase 2 notification | Replace email webhook with n8n workflow when n8n is live |
| Post-G1 (LQE live) | LQE-passed letters bypass Kate queue and go direct-to-delivery; SLA applies to escalations only |

**Notification setup required (Sprint 1):** Kate's email and Sarsh's email must be configured as webhook targets in Supabase. Supabase `artifacts` table insert trigger → HTTP POST to a Vercel API route → send email via Google Workspace SMTP. Test with a staging artifact before go-live.

---

## External Agent System (MA-AGT-001)

External agents live in `.claude/agents/<agent-name>.md`. All agents are subordinate to MA-PMP-001 → MA-LCH-004 → MA-SEC-002 → MA-AHP-001. Founder approval required for every activation.

**Phase 1 agents (install now):**
- `geo-seo-claude` repo → GEO-01 (content architect), GEO-02 (launch checklist), GEO-03 (denial-code writer)
- `agency-agents` repo → DEV-01 (security engineer), DEV-02 (backend architect), DEV-03 (reality checker)
- Custom composite → CNT-01 (YMYL compliance writer — build from technical-writer.md + legal-compliance-checker.md + MA context)

**Signal-gated agents (hold until trigger):**
- MKT-01 (Reddit community builder) — T-60 days before projected Signal 1
- MKT-03 (Growth Hacker) — Signal 1
- PRD-01 (Feedback Synthesizer) — Signal 1
- MKT-02 (SEO Growth Specialist) — Signal 2

**Install commands (Phase 1):**
```bash
git clone https://github.com/zubair-trabzada/geo-seo-claude.git && cd geo-seo-claude && ./install.sh
git clone https://github.com/msitarzewski/agency-agents.git
cp agency-agents/engineering/engineering-security-engineer.md .claude/agents/
cp agency-agents/engineering/engineering-backend-architect.md .claude/agents/
cp agency-agents/testing/testing-reality-checker.md .claude/agents/
```

Full specs and deployment sequence: MA-AGT-001 in `docs/agents/`. Notion Agent Registry has all MA IDs.

---

## Context Registry (MA-CTX-001)

**Governing doctrine:** Narrative lives in files. Structured truth lives in registries.

The `/context_registry/` folder contains 8 JSON files — the operational memory of the business. Agents read and write registries, not narrative docs.

**Build sequence:** `sources.json` → `decisions.json` → `denial_codes.json` → remaining 5 registries.

**Hard rules:**
- Every record MUST have a populated `source_ids` array — no orphaned records
- Status vocabulary is shared across all registries: `draft` → `active` → `needs_review` → `superseded` → `archived`
- The DB `denial_codes` table and `context_registry/denial_codes.json` are NOT duplicates — DB is runtime product, registry is agent intelligence layer
- Phase 2 scope: JSON files only. No DB infrastructure for registries in Phase 1.

**Inventory:** `sources.json`, `decisions.json`, `denial_codes.json`, `appeal_strategies.json`, `regulations.json`, `seo_clusters.json`, `content_pages.json`, `review_queue.json`

Full spec: MA-CTX-001 in `docs/context/`.

---

## Patient Story Engine (MA-SOC-002)

Story Bank collects and scrubs real patient experiences for YouTube Shorts and Instagram Reels. Both founders remain anonymous. AI actor character (English + Spanish) is the face of all video content.

**Current gate status:** Gate 0 — ELIGIBLE (platform tools live + first SEO article published = unlocks story bank)

**Pre-launch actions required:**
1. Deploy Supabase migration 016 (scrub_records table) — needed before Story Bank can log scrubbed stories
2. Attorney review of submission form consent language — add to existing pre-launch attorney review scope
3. HeyGen avatar selection (test 3 EN + 3 ES candidates)
4. Seed Story Bank: source, scrub, and approve 3 stories before Month 3 YouTube launch

**Hard rules:**
- NEVER use automated Reddit scraping — manual curation only (Reddit ToS)
- NEVER skip nurse review for flagged stories — pipeline hard stop if backlog >5
- NEVER use private group posts, DMs, or posts by apparent minors
- NEVER imply guaranteed outcomes in story scripts

Full spec: MA-SOC-002 in `docs/social/`.

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
1. `src/components/` shared UI library — ✅ Done
2. `daily.js` automation — ✅ Done
3. Cost architecture — ✅ Done (model routing, output caps, budget tripwires, per-feature telemetry)
4. Install external agents: GEO-01/02/03, CNT-01 (see Agent System above) — **IN PROGRESS**
5. Scaffold `/context_registry/` — 8 JSON files (MA-CTX-001) — **IN PROGRESS**
6. Deploy Supabase migration 016 — scrub_records table (MA-SOC-002 pre-launch)
7. **Deploy Supabase migration 019 — friction_events table stub (MA-SUP-DAT-001 Phase 1 P0)** — **NEXT**
8. Add friction event writes to Denial Decoder, Appeal Letter, and Bill Dispute tools (MA-SUP-DAT-001 Tasks 2–4)
9. Nurse co-founder review of claim_amount_range prompt language (MA-SUP-DAT-001 Task 5 — BLOCK for prompt deploy)
10. **Activate Content Refresh Agent — Phase 2 Sprint 1 (moved from Phase 4 per MA-SEO-SUP-001 §10)** — **NEXT**
11. **Implement page metadata fields: `content_tier`, `last_reviewed_date`, `source_dependency_type`, `refresh_priority_score` — Phase 2 Sprint 1 (MA-SEO-SUP-001 §12)**
12. **Implement outcome data schema for Annual Report prep — Phase 2 Sprint 2 (MA-SEO-SUP-001 §12)**
13. Launch SEO content engine with GEO template standard hardwired (target: 20 GEO-optimized articles in 60 days; first = Complete Guide to Insurance Claim Denials — Phase 1 launch gate)
14. Activate content-production-orchestrator pipeline
15. Beehiiv integration for newsletter capture
16. n8n automation setup (event routing, retention flows, budget alert webhooks) — Parking Lot
17. Landing page + /es Spanish page + custom domain — Google Workspace verified, admin@getmyadvocate.org live ✅
18. **[MA-AUT-006 G6 — Sprint 1] Write formal 7-gate chain spec + implement gates 1–3 in `generateLetter()` (MA-AUT-006 §G6 — retroactive launch gap)** — **NEXT**
19. **[MA-AUT-006 G1 — Sprint 2] Build LQE serial evaluator (3-check: denial code accuracy, YMYL, legal framing); calibrate with Kate; false positive rate <10% (MA-AUT-006 §G1 — retroactive launch gap)**
20. **[MA-AUT-006 G6 — Sprint 2] Implement gates 4–7 in `generateLetter()` (API call, LQE hook, disclaimer version check, artifact state)**
21. **[MA-AUT-006 G2 — Sprint 2] Document ACI tool schemas for CTO Sentinel + CFO Wealth Engineer with formal error behaviors**
22. **[MA-AUT-006 G3 — Sprint 2] Add stopping conditions (max retries + timeouts + failure state actions) to CFO Wealth Engineer and all deployed agents**
23. **[MA-AUT-006 G7 — Sprint 3] Draft MA-AUT-007 (Spanish Content Audit Agent spec); resolve Kate governance decision (Option A/B/C) before Month 7 hard deadline**
24. **[MA-AUT-006 G4 — Phase 2 signal-gated] Parallel YMYL voting (3-node) — trigger: >200 letters/month OR Kate review load >20% after G1 live**
25. **[MA-AUT-006 G5 — Phase 2 signal-gated] Chief of Staff Orchestrator — trigger: >15% multi-issue cases + attorney referral routing live**

---

## Staleness Policy
This file should be reviewed whenever:
- A new Phase begins (Phase 2 → 3, etc.)
- A new canonical doc is added
- The default stack changes (new vendor, new model string)
- The automation setup changes
- A new skill category is added to `.claude/skills/`

Last reviewed: **2026-03-13**

### Recent Changes
- 2026-03-13: Supplemental Security & Architecture Audit integrated — 10 gaps analyzed against recent work. 6 new MA-SEC-002 PassFail controls (P25–P30) added: server-side free-tier limits (P25/launch blocker), subscription tier authorization (P26/launch blocker), YMYL review operating model (P27/launch blocker), backup restoration test (P28/pre-Signal 1), incident response runbook (P29/pre-Signal 1), prompt version hash (P30/pre-Signal 1). Document upload formally deferred to Phase 2 — NER-grade PII redaction + malware scanning required. YMYL review operating model formalized: Kate primary/24hr SLA/queue cap 10/Sarsh escalation. Incident response runbook created (docs/security/incident-response-runbook.md). 3 new Core Invariants added (tier auth before generation, no doc upload without NER+malware, prompt_version_hash on every artifact). 11 Notion sprint tasks created. Quarterly backup test + 3-month VPN review scheduled as recurring tasks.
- 2026-03-13: MA-AUT-006 v2 integrated — Agent System Architecture Audit canonized. 7 gaps identified (G1–G7). G1 (LQE) and G6 (7-gate chain) are retroactive launch blockers requiring Phase 2 Sprint 1 remediation. G7 (Spanish Content Audit Agent/SCAA) is HIGH priority — design Sprint 3, build Phase 2, video activation Month 9, web activation Month 12. G4/G5 remain Phase 2 signal-gated. 4 new Core Invariants added (no generateLetter() modification without 7-gate spec, no letter output without LQE, no Spanish content without SCAA, no agent without stopping conditions). 1 new Scope Gate added (check MA-AUT-006 before any generateLetter() or agent change). Phase 2 Priorities updated (items 18–25 added). docs/agents/ updated with MA-AUT-006 docx. Conflicts with stale PMP reference (v20 → v24) and incorrect MA-SEC-001 ref (→ MA-SEC-002) flagged — MA-AUT-006 doc itself needs correction. MA-ARC-001 and MA-GAM-001 refs in MA-AUT-006 are unresolved (no matching canonical doc). Full spec: MA-AUT-006 in docs/agents/.
- 2026-03-13: MA-SEO-SUP-001 integrated — SEO Authority & Content Infrastructure Strategy canonized. PMP v24 created with new §6G. docs/seo/ updated with canonical file. 4 new Core Invariants added (cornerstone sequencing, GEO template Phase 1 standard, anonymous institutional voice, refresh-before-expand). 1 new Scope Gate added (check MA-SEO-SUP-001 before any content infrastructure work). Phase 2 Priorities updated (items 10–12 added: Content Refresh Agent moved to Sprint 1, page metadata fields Sprint 1, outcome data schema Sprint 2). Context registry updated (src_0013, dec_0010–dec_0014, 3 new seo_clusters, 10 new content_pages). Agent deployment revisions: Content Refresh Agent → Phase 2, Data/Insights Agent → Phase 3, CMO Outreach Module → Phase 3, CMO Spanish Track → Phase 4, GEO Module → Phase 1. Full spec: MA-SEO-SUP-001 in docs/seo/.
- 2026-03-12: MA-SUP-DAT-001 integrated — Proprietary Data Engine Strategy canonized. Supabase migration 019 (friction_events stub) created. PMP v23 created with new §6F. docs/data/ subdirectory created. Context registry updated (src_0012, dec_0009). 26 Notion sprint tasks created (MA-DAT-ENG-P1 through P4). Phase 2 Priorities updated (items 7–9 added). friction_events added to data architecture: two datasets (insurance friction events + appeal outcome events), four-layer privacy compliance, publication gates (Phase 3+), competitive moat analysis. Full spec: MA-SUP-DAT-001 in docs/data/.
- 2026-03-12: Projections v17 adopted as new operating base. v17 file saved to `docs/pmp/MyAdvocate_Projections_v17.xlsx`. v16 archived to `docs/pmp/archive/`. All canonical references updated.
- 2026-03-12: EEAT infrastructure build complete (MA-EEAT-001 §5.1 + §8.1). Shipped: Supabase migration 017 (content_audit_log, service-role only), `src/lib/eeat-validator.ts` (5-layer validator — schema, citations, forbidden claims, disclaimer, tier routing), `src/lib/db/audit-log.ts` (logContentReview helper), `scripts/validate-content.ts` (CLI runner for pre-publish validation), ContentTier/ReviewMethod/EEATValidationResult/ContentPageSchema types in `src/types/domain.ts`, and all 7 trust infrastructure pages (about, editorial-policy, medical-review-policy, reviewer-credentials, medical-disclaimer, citation-policy, update-policy — all ATTORNEY REVIEW REQUIRED before publish). 6 Notion sprint tasks created (migration 017 deploy, attorney engagement, Kate credential file, trust page publish, footer nav, EEAT integration test). Commit: a5cc96d.
- 2026-03-12: MA-EEAT-001 canonized — EEAT/YMYL audit hardwired into all SEO content. 3 new Core Invariants added (no content before trust pages, LPN/LVN framing, 5-layer gate). MA-EEAT-001 added to Scope Gates. docs/seo/ subdirectory created.
- 2026-03-12: Google Workspace verified — admin@getmyadvocate.org live. Stack table updated.
- 2026-03-12: Projections v16 built on v14 framework — YouTube (MA-YT-001) and Instagram (MA-IG-001) integrated as additive traffic + revenue streams (6 new columns Y-AD, 3,344 formulas, 0 errors, 36 months, 3 scenarios). v14 archived to docs/pmp/archive/. docs/pmp/ confirmed as canonical file location; GitHub = master.
- 2026-03-12: PMP v22 created — MA-YT-001 (YouTube & Spanish Strategy) and MA-IG-001 (Instagram Strategy v2.0) canonized into docs/social/. §6D (YouTube Revenue) and §6E (Instagram Revenue) added to PMP. Projections v16 replaces v15. CLAUDE.md canonical docs and docs/ structure updated.
- 2026-03-12: PMP v21 created — MA-CTX-001, MA-SOC-002, MA-AGT-001 canonized. Projections v15. External Agent System, Context Registry, and Patient Story Engine sections added to CLAUDE.md. docs/agents/, docs/context/, docs/social/ subdirectories added. Supabase migration 016 pending (scrub_records).
- 2026-03-12: Cost architecture shipped — `budget-monitor.ts`, model routing in `generate-letter.ts`, output caps, migration 015, MA-COST-001 canonical doc. 4 Parking Lot entries added (caching, retry optimization, n8n alerts, batch content rules).
- 2026-03-12: MA-SEC-002 extended to 24 controls (Priorities 21–24: AI Content Security). Additions in `docs/security/MA-SEC-002-additions-priorities-21-24.md` — pending manual update to Google Drive doc.
- 2026-03-12: docs/ reorganized into cost/, security/, pmp/, system/ subfolders.
- 2026-03-11: Fixed pre-commit hook — `automation/` and `scripts/` now excluded from ESLint staged-file check.
- 2026-03-11: Updated Repo Map to reflect actual `src/lib/` structure, API routes, and `src/types/`.
