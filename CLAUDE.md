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
| Automation | n8n | Phase 2 — event-driven automation, webhook routing, retention flows, budget alert webhooks |
| AI Provider | Anthropic | All calls via `generateLetter()` — Haiku default, Sonnet for complex/doc cases |
| Local Intelligence | BitNet | **Pre-launch internal layer** — classification, scoring, routing. NEVER user-facing. Powers SEO intelligence engine, LQE pre-screener, book keyword scan, competitive signal classification. See BitNet Architecture section. |
| Scoring Engine | FastAPI V4 Modular (internal) | **Pre-launch internal layer** — /analyze + /feedback; 5-score model (Confidence/Impact/Risk/Urgency/Learning); CTO/CMO/CFO/UX/COMPLIANCE agents; `autonomous_allowed` safety flag; modular structure (app/models.py, app/engine.py, app/main.py); state-backed (Supabase); NEVER public. See V4 Scoring Service Architecture section. |
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
  - `db/` — 12 domain helpers: artifacts, cases, denial-codes, documents, extraction-outputs, friction-events, metric-events, outcome-events, resource-routes, review-queue, subscriptions, users
  - `supabase/` — `client.ts` (anon/browser), `server.ts` (service role)
  - `auth.ts`, `stripe.ts`, `rate-limit.ts`, `parse-document.ts`
  - `generate-letter.ts` — single Anthropic call boundary (never bypass); full 7-gate chain live (Gate 1 tier auth, Gate 2 PII scrub+verify, Gate 3 output cap, Gate 4 input validation, Gate 5 context firewall/CONTEXT_ALLOWLIST, Gate 6 LQE, Gate 7a/7b post-gen integrity); `logGateFailure()` accepts optional `WorkflowContract` snapshot; `OUTPUT_CONFIG` + `CONTEXT_ALLOWLIST` exported; `buildWorkflowContract()` exported; `promptVersionHash` computed + persisted on every artifact (SEC-P30 ✅)
  - `lqe.ts` — 3-check Letter Quality Evaluator (denial code accuracy, YMYL safety, legal framing). Zero Anthropic calls. 21 unit tests. Serial halt verified. ✅ LIVE
  - `auth-tier.ts` — `checkTierAuthorization(userId, letterType)` — server-side tier gate (Gate 1). ✅ LIVE
  - `bitnet-prescreener.ts` — BitNet pre-screener integration. Returns confidence score + routing path. NEVER produces user-facing output.
  - `budget-monitor.ts` — Redis-based API spend tracking and tripwire alerts; Phase 2: alerts fire n8n webhook (MA-COST-001)
  - `pii-scrubber.ts` — `scrubPII()` + `verifyScrubbed()` (exported). Must run before every API call. Gate 2 asserts clean result.
  - `disclaimer.ts` — appended to all user-facing outputs
- `src/types/` — `domain.ts` (shared enums/interfaces incl. `ModelTier`, `LetterType` canonical location, `WorkflowContract` ✅ AIR-01), `supabase.ts` (generated DB types)
- `src/components/` — shared UI: Button, Input, FormField, Card, Alert, Nav
- `supabase/migrations/` — 22 migrations applied; 016–022 pending deploy (scrub_records, friction_events, appeal_outcome_events, bitnet_calibration, competitive_signals, founder_inbox, prompt A/B variant fields). Append-only (see `supabase/migrations/CLAUDE.md`)
- `supabase/seed/` — seed data for denial codes and resource routes
- `context_registry/` — Agent intelligence layer (MA-CTX-001): **12 JSON registries** (8 original + 4 new from MA-IMPL-002). NOT a database. See Section "Context Registry" below.
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
- NEVER let BitNet output reach users — BitNet is classification, scoring, and routing only; zero user-facing output; all letter generation still goes through generateLetter() → LQE → Kate path (MA-IMPL-002)
- NEVER enable BitNet fast path (confidence ≥ 0.95 LQE bypass) until `bitnet_calibration` table has ≥ 50 Kate-reviewed records AND false positive rate is confirmed <10% (MA-IMPL-002 §4.3)
- NEVER write to `context_registry/` JSON files directly from product code — only BitNet jobs, n8n workflows, and Claude agents write to registries; never from API routes or page handlers (MA-CTX-001)
- NEVER expose the V4 Scoring Service endpoint publicly — it is internal infrastructure only; no user data, no PII, and no letter content flows through /analyze or /feedback (MA-IMPL-003)
- NEVER permit AUTO tier scoring decisions for Bucket 1 AI outputs (letter generation) — AUTO is restricted to SEO/content sequencing, cluster prioritization, content refresh, and infrastructure cost alerts only; letter generation always requires the human approval path (MA-IMPL-003)
- NEVER activate the CMO Content Refresh n8n workflow before BitNet cluster scoring has produced a valid ranked_queue.json — the workflow depends on the scored queue as its data source (MA-IMPL-003)
- NEVER adjust scoring service agent_weights or decision thresholds without a corresponding /feedback entry — all weight evolution must be traceable through feedback_history.jsonl and the Supabase scoring_feedback table (MA-IMPL-003)
- NEVER set `autonomous_allowed: true` on a scoring service request for Bucket 1 AI outputs (letter generation) — the `autonomous_allowed` flag is a hard API-layer gate; it is only permitted for SEO/content sequencing, content refresh, and infrastructure cost alert decisions (MA-IMPL-003)
- NEVER write to `billing_events`, `page_metrics_daily`, `tool_sessions`, or `decision_log` from API routes or page handlers — these tables are written exclusively by n8n real-data intake workflows and the scoring service (MA-IMPL-003)
- NEVER activate the real-data intake n8n workflows (`stripe_webhook_to_supabase`, `cmo_real_data_refresh_queue`, `cfo_cohort_scoring`) until Supabase migration 023 has been applied and the target tables are confirmed live (MA-IMPL-003)

### Scope Gates
- Check MA-LCH-004 before building any new feature (Phase 1 scope boundary)
- Check MA-SEC-002 before any feature touching user data (24 controls, all must PASS)
- Check MA-COST-001 before any new AI call site — classify as Bucket 1/2/3 first
- Check MA-EEAT-001 before designing any content workflow, reviewer system, or trust infrastructure page
- Check MA-SEO-SUP-001 before designing any SEO content cluster, cornerstone guide, refresh system, content tier classification, or GEO template — this document is the operating doctrine for all content infrastructure decisions
- Check MA-AUT-006 before any modification to `generateLetter()`, any new agent deployment, or any change to the letter quality pipeline — G1/G6 are retroactive launch gaps that must be cleared; G4/G5 are signal-gated and must not be pulled forward
- Check Parking Lot in Notion before adding infrastructure that has a deferred phase tag
- Check MA-IMPL-002 before any BitNet job deployment, competitive signal pipeline change, content staging state machine change, or LQE hybrid routing modification
- Check MA-IMPL-003 before any V4 Scoring Service modification (main.py), n8n workflow deployment or change, agent weighting adjustment, decision threshold change, or new decision_type registration

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
- `MA-IMPL-001` — Strategic Implementation Plan — canonical source of truth for integrating 21 uploaded build pack documents into Phase 2 roadmap; supersession chain for all source docs — `docs/MA-IMPL-001_Strategic_Implementation_Plan.docx` ← read before any Phase 2 architecture decision
- `MA-IMPL-002` — Pre-Launch Intelligence & Automation Architecture — BitNet SEO intelligence engine (hub/spoke scoring, book monitoring), content staging pipeline (50-page queue, 9-state machine), pre-launch data collection (migrations 020–022), LQE + BitNet hybrid 3-path routing, competitive signal collection (CMS/NAIC/payer bulletins), integration sequence (8-week calendar). **All six workstreams are internal-only and pre-launch safe.** — `docs/intelligence/MA-IMPL-002_PreLaunch_Intelligence_Architecture.docx` ← hardwired into all BitNet, n8n, and data collection decisions
- `MA-IMPL-003` — V4 Scoring Service & Autonomous Agent Architecture — Month 0-12 rollout plan; FastAPI scoring service (/analyze + /feedback); 5-dimension scoring math; 4-agent model (CTO/CMO/CFO/UX); n8n wiring guide (3 starter workflows); decision routing thresholds (AUTO/APPROVAL/LOG/BLOCK/IGNORE); learning loop spec; agent coordination hierarchy; stopping conditions — `docs/intelligence/MA-IMPL-003_BitNet_V4_Month0-12_Rollout.docx` ← hardwired into all Scoring Service, n8n workflow, and agent coordination decisions
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
  intelligence/ MA-IMPL-001_Strategic_Implementation_Plan.docx       ← NEW 2026-03-19 — 21-doc integration plan, Phase 2 build sequence
              MA-IMPL-002_PreLaunch_Intelligence_Architecture.docx   ← NEW 2026-03-19 — BitNet SEO engine, staging pipeline, data collection, LQE hybrid, competitive signals
              MA-IMPL-003_BitNet_V4_Month0-12_Rollout.docx         ← NEW 2026-03-19 — V4 scoring service, n8n wiring, Month 0-12 gates, agent coordination
  review/     Reviewer-facing operational materials for Kate + Sarsh ONLY. Not for technical architecture docs.
              LQE_Calibration_Guide_Kate.docx  ← LQE calibration session guide (Sprint 2 Kate handoff)
              [future: YMYL_Review_Checklist.docx, Kate_Onboarding_Guide.docx, Content_Review_SOP.docx]
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

**Original inventory (8):** `sources.json`, `decisions.json`, `denial_codes.json`, `appeal_strategies.json`, `regulations.json`, `seo_clusters.json`, `content_pages.json`, `review_queue.json`

**New registries (MA-IMPL-002, Phase 2):**
- `ranked_queue.json` — BitNet-scored, dependency-resolved content production queue. GEO agents read this. n8n updates weekly (Sunday 2am). Source of truth for what to write next.
- `payer_intelligence.json` — Structured payer-level data: denial_rate_by_category, known_prior_auth_triggers, appeal_win_rate_by_letter_type, recent_policy_changes. Seeded from CMS + NAIC. Powers Phase 3 payer-aware letter tuning.
- `book_keyword_signals.json` — BitNet scans every new book chapter and extracts patient-voice keyword patterns and cluster_affinity scores. GEO agents consume keyword signals. Enables book → SEO compounding without extra work.
- `spanish_keyword_signals.json` — BitNet-generated Spanish search demand signals for top 20 denial code pages. Internal intelligence only. Feeds Phase 4 Spanish content planning. No content generated until SCAA gate clears.

**Write rules:** Only BitNet jobs, n8n workflows, and Claude agents write to registries. Never from API routes, page handlers, or user-triggered actions.

Full spec: MA-CTX-001 in `docs/context/`. Intelligence pipeline spec: MA-IMPL-002 in `docs/intelligence/`.

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

## BitNet Architecture (MA-IMPL-002)

**Role:** Internal intelligence layer only. Never user-facing. Powers SEO scoring, content queue, LQE pre-screening, book keyword extraction, competitive signal classification. All jobs must have defined stopping conditions per MA-AUT-006 G3.

**Canonical doc:** `MyAdvocate_BitNet_Architecture_Report_v3.docx` (in uploads) — 16 sections including Board of Agents expansion, SEO engine, n8n workflow contracts, Supabase tables, and monitoring playbook.

**Jobs and stopping conditions:**

| Job | Cron | Max Retries | Timeout | Failure Action |
|---|---|---|---|---|
| `cluster-scoring` | Sunday 2am | 5 | 120s | skip + Slack alert |
| `page-scoring` | Sunday 2am (after cluster) | 3 | 60s | skip + log |
| `pre-screener` | Per-request | 2 | 10s | route to standard LQE path |
| `book-chapter-scan` | On file write to docs/book/chapters/ | 2 | 30s | skip + log |
| `competitive-signal-classify` | Per-ingest | 2 | 15s | store as unclassified + log |
| `denial-code-enrichment` | Nightly (after 4-week stability gate) | 3 | 90s | skip + alert if >3 failures/week |

**LQE + BitNet 3-path routing:**
- **Fast path** (confidence ≥ 0.95): bypasses LQE regex — DISABLED until `bitnet_calibration` ≥ 50 samples + false positive rate <10%
- **Standard path** (confidence 0.60–0.94): full 3-check LQE runs
- **Review path** (confidence < 0.60 or any LQE fail): Kate queue — failure_reason logged
- **Scale path** (signal-gated): parallel YMYL voting — trigger >200 letters/month or Kate load >20%

PII scrubber, output contract validation, disclaimer, and artifact state write are NOT bypassed on any path.

**Amendability:** BitNet jobs are independently deployable — add a new job by: (1) defining it in `src/lib/bitnet-prescreener.ts` with stopping conditions, (2) adding the n8n cron trigger, (3) creating or updating the target registry file. No changes to generateLetter() required unless adding pre-screener logic.

---

## V4 Scoring Service Architecture (MA-IMPL-003)

**Role:** Internal autonomous decision engine. Never user-facing. Orchestrates agent-level decisions for SEO content prioritization, infrastructure cost alerts, and conversion optimization. Sits between BitNet (classification/scoring output) and n8n (workflow execution). Single FastAPI instance per environment.

**Canonical doc:** `docs/intelligence/MA-IMPL-003_BitNet_V4_Month0-12_Rollout.docx`

**Endpoints:**
- `POST /analyze` — 16 metric inputs + agent + decision_type → 5 scores + action + reason
- `POST /feedback` — learning loop update; nudges historical_accuracy after each outcome
- `GET /state` — full weights + historical accuracy per decision_type
- `GET /health` — service health check

**5-dimension scoring model:**
| Score | Key Inputs | Historical Boost |
|---|---|---|
| Confidence | volume, consistency, accuracy | +15% from historical_accuracy_by_decision_type |
| Impact | revenue, traffic, compounding | — |
| Risk | volatility, dependency, compliance | — |
| Urgency | trend, decay, window | — |
| Learning | uncertainty, experiment, gap | — |

**`autonomous_allowed` safety flag:** Every `/analyze` request carries `autonomous_allowed: bool` (default `false`). AUTO tier only fires when this is explicitly `true`. Bucket 1 AI calls (letter generation) **never** set this flag. COMPLIANCE agent sets `compliance_flag: true` → unconditional BLOCK regardless of score.

**Agent weightings (DEFAULT_AGENT_WEIGHTS in app/engine.py):**
| Agent | Primary Focus | Decision Formula |
|---|---|---|
| CTO | Risk + Urgency | 0.40×risk + 0.30×urgency + 0.20×impact + 0.10×confidence |
| CFO | Impact − Risk | 0.45×impact + 0.25×confidence + 0.15×urgency + 0.15×learning − 0.30×risk |
| CMO | Impact + Confidence | 0.35×impact + 0.25×confidence + 0.20×urgency + 0.20×learning − 0.20×risk |
| UX | Impact + Learning | 0.30×impact + 0.30×learning + 0.20×confidence + 0.20×urgency − 0.15×risk |
| COMPLIANCE | Risk-blocking | 0.50×risk + 0.20×confidence + 0.20×urgency + 0.10×impact — always BLOCK if compliance_flag=true or risk≥0.50 |

**Decision routing (applied in order — risk check first):**
| Condition | Action | n8n Behavior |
|---|---|---|
| risk > 0.75 | BLOCK | Critical Slack alert only |
| confidence < 0.50 | IGNORE | No-op |
| score ≥ 0.80 | AUTO | Execute + Slack audit trail (never Bucket 1 AI calls) |
| score 0.65–0.80 | APPROVAL | Slack approval card; Sarsh reviews within 24h |
| score 0.45–0.65 | LOG | Supabase digest; surfaces in daily founder digest |
| score < 0.45 | IGNORE | No-op |

**n8n workflows (all in `scoring_service/n8n_workflows/`):**

*Scoring-logic workflows (internal signal routing):*
- `cto_sentinel.json` — Every 6h; api_cost_spike detection; CTO agent → S0-01
- `cmo_content_refresh.json` — Weekly Sunday 3am; content decay signals; CMO agent → S1-02
- `cfo_conversion_insight.json` — Weekly Tuesday 6am; funnel metrics; CFO agent → S2-01

*Real-data intake workflows (Supabase wiring calendar):*
- `stripe_webhook_to_supabase.json` — Week 1; Stripe webhook → billing_events; CFO revenue signals
- `cmo_real_data_refresh_queue.json` — Week 2; Google Search Console → page_metrics_daily; CMO decay scoring
- `cfo_cohort_scoring.json` — Week 3; GA4 → tool_sessions + v_funnel_rollup; UX/CFO conversion scoring

**Real-data wiring calendar (approval-only for all of Year 1):**
| Week | Source | Target Table | Agent | First Decisions |
|------|--------|-------------|-------|----------------|
| Week 1 | Stripe webhooks | billing_events | CFO | Failed-payment recovery, offer timing |
| Week 2 | Google Search Console | page_metrics_daily | CMO | Declining pages, high-impression/low-CTR queue |
| Week 3 | GA4 events | tool_sessions | UX / CFO | Funnel drop-off, cohort paid-offer timing |
| Week 4 | App/API logs | decision_log (CTO) | CTO | Cost spikes, latency, workflow failures |
| Week 5+ | All sources joined | All tables | All agents | Unified scoring with AUTO tier validation |

**Slack channel architecture:**
| Channel | Purpose | Who gets pinged |
|---------|---------|----------------|
| `#agent-alerts-critical` | BLOCK conditions; CTO risk > 0.75 | Sarsh immediately |
| `#agent-approvals` | APPROVAL tier cards; all agents | Sarsh within 24h |
| `#content-growth` | CMO content refresh actions | Sarsh weekly digest |
| `#cfo-insights` | CFO revenue + conversion signals | Sarsh weekly digest |
| `#cto-sentinel` | CTO cost + reliability monitoring | Sarsh on-threshold alert |

**Agent coordination hierarchy (conflict resolution):**
Priority order: CTO (BLOCK absolute) → Compliance/LQE → CFO → CMO → UX. When two agents have pending APPROVAL actions in the same 6h window, priority_score = agent_weight × decision_score determines which wins. CTO BLOCK overrides unconditionally.

**Month 0–12 activation gates:**
- Month 0 (now): Scoring service deployed. CTO Sentinel live. All actions at APPROVAL/LOG — no AUTO.
- Month 1–2 (S1-01/S1-02): Action routing live. CMO Content Refresh live. ranked_queue.json initialized.
- Month 3–4 (S2-01): CFO Conversion Insight live. Learning loop 50-decision checkpoint.
- Month 4–6 (S2-02): Fast path calibration gate. AUTO tier validation (content/infra only, never letters).
- Month 7–9 (S3-01, future): Full 4-agent coordination. SCAA spec. Signal 1 prep.
- Month 9–12 (S4-01, signal-gated): Parallel YMYL voting (if triggered). MKT agents. Scale path.

**Amendability:** Scoring service is independently deployable. Add a new agent by: (1) adding weight profile to DEFAULT_AGENT_WEIGHTS in main.py, (2) creating/updating the corresponding n8n workflow, (3) registering the new decision_type in Supabase scoring_decisions table, (4) logging a /feedback entry. No changes to generateLetter() or BitNet required.

---

## Content Staging Pipeline (MA-IMPL-002)

**50-page staging pool.** State machine: `draft` → `bitnet_scored` → `eeat_pending` → `eeat_passed` → `review_queue` → `approved` → `scheduled` → `published` → `needs_refresh`

**Queue rules:**
- Max staging pool: 50 pages (draft through eeat_passed)
- Max Kate review queue: 10 pages (review_queue state)
- If staging pool > 45: n8n alerts Sarsh
- If Kate queue = 10: new eeat_passed pages hold — n8n does NOT auto-advance
- needs_refresh pages jump ahead of new drafts in review queue (MA-SEO-SUP-001 §6)
- No page may exit `staged` state until all 7 trust pages are attorney-reviewed (MA-EEAT-001 §5.1 hard blocker)

---

## Phase 2 Priorities (Current)
1. `src/components/` shared UI library — ✅ Done
2. `daily.js` automation — ✅ Done
3. Cost architecture — ✅ Done (model routing, output caps, budget tripwires, per-feature telemetry)
4. Install external agents: GEO-01/02/03, CNT-01 (see Agent System above) — **IN PROGRESS**
5. Scaffold `/context_registry/` — 8 JSON files (MA-CTX-001) — **IN PROGRESS**
6. **[MA-IMPL-002 S1-01] Deploy migrations 016, 019, 020, 021, 022 — scrub_records, friction_events, appeal_outcome_events, bitnet_calibration, competitive_signals** — **NEXT**
6a. **[MA-IMPL-003 S0-01] Apply migration 023 (`023_real_data_pipeline.sql`) — creates pages, page_metrics_daily, tool_sessions, billing_events, decision_log, content_queue, experiments, feedback_outcomes tables + 2 views** — **NEXT**
7. **[MA-IMPL-002 S1-01] Instrument tools — write friction_events on every tool interaction (Denial Decoder, Appeal, Bill Dispute)** — **NEXT**
8. **[MA-IMPL-002 S1-01] Instrument generateLetter() — write appeal_outcome_events stub on every letter generation** — **NEXT**
9. **[MA-IMPL-002 S1-01] n8n skeleton — CTO Sentinel + budget webhooks (replace console.log tripwires)** — **NEXT**
10. **[MA-IMPL-002 S1-01] n8n 30-day outcome follow-up email automation** — **NEXT**
11. **[MA-IMPL-002 S1-01] Google Search Console — register all 237 planned URLs** — **NEXT**
12. Nurse co-founder review of claim_amount_range prompt language (MA-SUP-DAT-001 Task 5 — BLOCK for prompt deploy)
13. **Activate Content Refresh Agent — Phase 2 Sprint 1 (moved from Phase 4 per MA-SEO-SUP-001 §10)**
14. **Implement page metadata fields: `content_tier`, `last_reviewed_date`, `source_dependency_type`, `refresh_priority_score` — Phase 2 Sprint 1 (MA-SEO-SUP-001 §12)**
15. **[MA-IMPL-002 S2-01] BitNet service setup — local model, REST, stopping conditions documented**
16. **[MA-IMPL-002 S2-01] BitNet cluster + page scoring pass — all 237 pages; ranked_queue.json generated**
17. **[MA-IMPL-002 S2-01] BitNet book chapter scan — keyword signals + cluster affinity → context_registry/**
18. **[MA-IMPL-002 S2-01] LQE + BitNet hybrid pre-screener wired into generateLetter() (fast path disabled until calibration gate)**
19. **[MA-IMPL-002 S2-01] Kate calibration session — 15-20 test letters; false positive rate target <10%**
20. **[MA-IMPL-002 S2-01] payer_intelligence.json registry initialized from CMS + NAIC (top 10 payers)**
21. **[MA-IMPL-002 S2-01] Content staging pipeline dry-run — 5 pages, all stages, publish suppressed**
22. **[MA-IMPL-002 S2-02] Slack ops command center — founder_inbox + L1/L2/L3 approval routing**
23. **[MA-IMPL-002 S2-02] n8n daily founder intelligence digest (Slack Block Kit)**
24. **[MA-IMPL-002 S2-02] n8n CMS data fetch + BitNet classification — first competitive signal pass**
25. **[MA-IMPL-002 S2-02] n8n payer bulletin feed collection — weekly, top 10 payers**
26. **[MA-IMPL-002 S2-02] Prompt A/B framework scaffolding (variant_flag + prompt_variant_id)**
27. **[MA-IMPL-002 S2-02] Spanish keyword intelligence scan — BitNet internal, no content generated**
28. Launch SEO content engine with GEO template standard hardwired (target: 20 GEO-optimized articles in 60 days; first = Complete Guide to Insurance Claim Denials — Phase 1 launch gate)
29. Beehiiv integration for newsletter capture
30. Landing page + /es Spanish page + custom domain — Google Workspace verified, admin@getmyadvocate.org live ✅
31. **[MA-AUT-006 G6 — Sprint 1] Write formal 7-gate chain spec + implement gates 1–3 in `generateLetter()` (MA-AUT-006 §G6 — retroactive launch gap)** — ✅ DONE (2026-03-19)
32. **[MA-AUT-006 G1 — Sprint 2] LQE serial evaluator built; calibrate with Kate; false positive rate <10% (MA-AUT-006 §G1)** — ✅ DONE (2026-03-19) — `src/lib/lqe.ts` live; 21 unit tests + 3 integration tests; zero Anthropic calls; serial halt verified
33. **[MA-AUT-006 G6 — Sprint 2] Implement gates 4–7 in `generateLetter()` (API call, LQE hook, disclaimer version check, artifact state)** — ✅ DONE (2026-03-19) — full 7-gate chain live; 42 tests pass; `logGateFailure()` shared helper; Gate 7 = 7a/7b merged block
34. **[MA-AUT-006 G2 — Sprint 2] Document ACI tool schemas for CTO Sentinel + CFO Wealth Engineer**
35. **[MA-AUT-006 G3 — Sprint 2] Add stopping conditions to CFO Wealth Engineer and all deployed agents**
36. **[MA-AUT-006 G7 — Sprint 3] Draft MA-AUT-007 (Spanish Content Audit Agent spec); resolve Kate governance decision before Month 7**
37. **[MA-AUT-006 G4 — signal-gated] Parallel YMYL voting — trigger: >200 letters/month OR Kate review load >20%**
38. **[MA-AUT-006 G5 — signal-gated] Chief of Staff Orchestrator — trigger: >15% multi-issue cases + attorney referral routing live**
39. **[MA-IMPL-003 S0-01] Deploy V4 Scoring Service (FastAPI) — internal infra, /analyze + /feedback live, state-backed to Supabase**
40. **[MA-IMPL-003 S0-01] Wire CTO Sentinel n8n workflow — 6h api_cost_spike detection + Slack APPROVAL routing**
41. **[MA-IMPL-003 S1-01] Wire scoring service to n8n action routing — all 5 tiers (AUTO/APPROVAL/LOG/BLOCK/IGNORE)**
42. **[MA-IMPL-003 S1-01] Instrument scoring /feedback — Kate calibration decisions seed learning loop**
43. **[MA-IMPL-003 S1-02] Deploy CMO Content Refresh n8n workflow — weekly, scoring-gated content action decisions**
44. **[MA-IMPL-003 S1-02] BitNet cluster scoring to scoring service integration — cluster_priority_score pipeline**
45. **[MA-IMPL-003 S1-02] Initialize ranked_queue.json — first full BitNet cluster + page scoring pass**
46. **[MA-IMPL-003 S2-01] Deploy CFO Conversion Insight n8n workflow — weekly, funnel-based revenue scoring**
47. **[MA-IMPL-003 S2-01] Scoring service learning loop checkpoint — 50+ decisions, drift analysis, document findings**
48. **[MA-IMPL-003 S2-01] n8n daily founder intelligence digest — Slack Block Kit, scoring state + BitNet signals**
49. **[MA-IMPL-003 S2-01] Slack ops command center — L1/L2/L3 approval routing wired to scoring thresholds**
50. **[MA-IMPL-003 S2-02] BitNet fast path calibration gate review — ≥50 Kate records + false positive <10% check; Sarsh sign-off required**
51. **[MA-IMPL-003 S2-02] Scoring service AUTO tier validation — first autonomous decisions with Slack audit trail; content/infra only**
52. **[MA-IMPL-003 S2-02] Full agent coordination hierarchy live — CTO→Compliance→CFO→CMO→UX via priority_score conflict resolution**
53. **[MA-IMPL-003 S0-01 Real Data] Configure Stripe webhook → `stripe_webhook_to_supabase` n8n workflow; write billing_events; approval-only** — **NEXT (Week 1)**
54. **[MA-IMPL-003 S0-01 Real Data] Wire Google Search Console → `cmo_real_data_refresh_queue` n8n workflow; populate page_metrics_daily; CMO refresh queue** — **NEXT (Week 2)**
55. **[MA-IMPL-003 S1-01 Real Data] Wire GA4 events → `cfo_cohort_scoring` n8n workflow; populate tool_sessions; UX/CFO funnel scoring** — **NEXT (Week 3)**
56. **[MA-IMPL-003 S1-01 Real Data] App/API log collection → CTO Sentinel; cost_per_call + latency + failure_rate → decision_log** — **(Week 4)**
57. **[MA-IMPL-003 S1-02 Real Data] Normalize all source fields to 0-1 scoring inputs per FIELD_MAPPING.md; validate against /analyze endpoint**
58. **[MA-IMPL-003 S1-02 Real Data] Configure Slack channel architecture: #agent-alerts-critical, #agent-approvals, #content-growth, #cfo-insights, #cto-sentinel**
59. **[MA-IMPL-003 S2-01 Real Data] Join all 4 data sources in Supabase; unified scoring across CMO/CFO/CTO/UX agents; begin feedback-based calibration**
60. **[MA-IMPL-003 S2-02 Real Data] Scoring service COMPLIANCE agent activation — compliance_flag enforcement wired to all real-data decision paths**

---

## Staleness Policy
This file should be reviewed whenever:
- A new Phase begins (Phase 2 → 3, etc.)
- A new canonical doc is added
- The default stack changes (new vendor, new model string)
- The automation setup changes
- A new skill category is added to `.claude/skills/`

Last reviewed: **2026-03-19**

### Recent Changes
- 2026-03-19: AIR-01 complete (WorkflowContract type). `LetterType` moved to canonical location in `src/types/domain.ts`. `WorkflowContract` interface added with all gate flags typed as literals (`releaseState: 'review_required'`). `buildWorkflowContract()` exported from `generate-letter.ts` — called before Gate 1, snapshot passed to `logGateFailure()` on every gate failure. `CONTEXT_ALLOWLIST` now exported (needed by AIR-04). 173 tests passing. AIR-03 and AIR-04 now unblocked (parallel).
- 2026-03-19: Full 7-gate chain shipped (MA-AUT-006 G6 + G1 — retroactive launch gaps cleared). `generate-letter.ts` now enforces all 7 gates: Gate 1 `checkTierAuthorization()` (GATE_1_FAILED halt), Gate 2 `scrubPII()` + `verifyScrubbed()` (GATE_2_FAILED halt), Gate 3 `OUTPUT_CONFIG` cap enforcement (GATE_3_FAILED halt), Gate 4 input validation (GATE_4_FAILED halt), Gate 5 context firewall/CONTEXT_ALLOWLIST (GATE_5_STRIPPED warn-only), Gate 6 LQE (routes to Kate queue on fail), Gate 7a/7b disclaimer version + artifact state (GATE_7_FAILED halt). `logGateFailure()` shared helper emits identical `gate_failure` telemetry events across all gates — admin dashboard and n8n can filter on `eventType === 'gate_failure'` without gate-specific logic. `lqe.ts` live: 3 serial checks (denial code accuracy, YMYL safety, legal framing), zero Anthropic calls, 21 unit tests, serial halt verified. `auth-tier.ts` created with `checkTierAuthorization()`. `pii-scrubber.ts` extended with `verifyScrubbed()` + `PII_FIELDS` export. `promptVersionHash` SHA-256 computed and persisted on every artifact (SEC-P30 ✅). 42 gate tests + 21 LQE tests = 123 total tests passing. AIR-02 complete (CONTEXT_ALLOWLIST embedded in Gate 5). AIR-01/AIR-03/AIR-04 remain pending.
- 2026-03-19: Real Data Wiring Build Pack integrated — Scoring service upgraded to v2.0 modular structure (app/models.py + app/engine.py + app/main.py + tests/test_engine.py). COMPLIANCE agent (5th agent, risk-blocking formula) added. `autonomous_allowed: bool` safety flag added to every /analyze request — AUTO tier now requires explicit opt-in, never fires on Bucket 1 AI calls. 3 real-data intake n8n workflows added to scoring_service/n8n_workflows/: stripe_webhook_to_supabase (Week 1), cmo_real_data_refresh_queue (Week 2), cfo_cohort_scoring (Week 3). Supabase migration 023 created (8 tables: pages, page_metrics_daily, tool_sessions, billing_events, decision_log, content_queue, experiments, feedback_outcomes; 2 views: v_page_refresh_candidates, v_funnel_rollup). Real-data wiring calendar added (Weeks 1-4 phased source rollout). Slack channel architecture documented (5 channels). 3 new Core Invariants added (autonomous_allowed never true for Bucket 1, real-data tables write-only from n8n/scoring service, real-data workflows gated on migration 023). Phase 2 Priorities expanded to 60 items (53-60: real-data wiring sprint). Field mapping + implementation checklist in scoring_service/docs/.
- 2026-03-19: MA-IMPL-003 integrated — V4 Scoring Service & Autonomous Agent Architecture canonized. FastAPI scoring service (main.py from scoring pack) formalized as internal intelligence layer: /analyze + /feedback endpoints; 5-score model (Confidence/Impact/Risk/Urgency/Learning); 4-agent weightings (CTO/CMO/CFO/UX); 5-tier decision routing (AUTO/APPROVAL/LOG/BLOCK/IGNORE). 3 n8n starter workflows registered (CTO Sentinel S0-01, CMO Content Refresh S1-02, CFO Conversion Insight S2-01). Month 0-12 activation gates defined. Learning loop spec (historical_accuracy_by_decision_type). Agent coordination hierarchy + conflict resolution protocol. 4 new Core Invariants added (scoring service never public, AUTO never Bucket 1, CMO workflow gated on ranked_queue.json, all weight changes logged). 1 new Scope Gate added (check MA-IMPL-003 before any scoring/n8n changes). 14 new Phase 2 Priority items added (39–52). V4 Scoring Service Architecture section added. Stack table updated with Scoring Engine row. Docs structure updated (MA-IMPL-003 added to intelligence/). 15 Notion sprint tasks created across S0-01 through S2-02. Canonical doc: docs/intelligence/MA-IMPL-003_BitNet_V4_Month0-12_Rollout.docx.
- 2026-03-19: MA-IMPL-002 integrated — Pre-Launch Intelligence & Automation Architecture canonized. 6 workstreams accelerated to pre-launch (internal only, no public rollout): SEO Intelligence Engine (BitNet hub/spoke cluster scoring + book monitoring), content staging pipeline (50-page queue, 9-state machine), pre-launch data collection (migrations 020-022: appeal_outcome_events, bitnet_calibration, competitive_signals), LQE + BitNet hybrid 3-path routing (fast/standard/review; fast path disabled until ≥50 calibration samples), competitive signal collection (CMS/NAIC/payer bulletins via n8n). 3 new Core Invariants added (BitNet never user-facing, fast path calibration gate, no registry writes from product code). 1 new Scope Gate added (check MA-IMPL-002 before any BitNet/signal pipeline change). 4 new context registry files added (ranked_queue.json, payer_intelligence.json, book_keyword_signals.json, spanish_keyword_signals.json). BitNet Architecture section added. Content Staging Pipeline section added. Phase 2 Priorities expanded to 38 items. Stack table updated with BitNet. 25 Notion sprint tasks created (S1-01 through S2-02). 10 Parking Lot entries created (signal-gated and Phase 3+ items). Canonical docs updated: MA-IMPL-001 + MA-IMPL-002 added to docs/intelligence/. docs/intelligence/ subdirectory created.
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
