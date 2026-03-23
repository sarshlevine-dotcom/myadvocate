# SYSTEM.md — MyAdvocate System Architecture & Governance

> **Document ID:** MA-SYS-001
> **Authority:** Subordinate to MA-PMP-001 v30 → MA-ARC-001. This document describes system architecture and tool governance for operational reference.
> **Last updated:** March 22, 2026

---

## Mission

Give everyday Americans the same institutional power that insurance companies, hospital billing departments, and care facility operators have been using against them for decades.

MyAdvocate is a **healthcare insurance and advocacy execution engine** — not a blog, not a generic SaaS. Every feature produces a real, usable output: letters citing statutes, phone scripts, regulator contacts, state-specific rights.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     INTELLIGENCE LAYER                      │
│  NotebookLM (synthesis) · Denial Intelligence · AKG        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    PRODUCTION LAYER                         │
│  NotebookLM → Opal (packaging) → Claude Cowork (normalize) │
│  → GitHub (source of truth) → Publication                  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   EXECUTION LAYER                           │
│  OpenHands (engineering) · n8n (automation)                │
│  Claude Cowork (task specs, normalization)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                     DATA LAYER                              │
│  Supabase (Postgres + RLS) · Redis L1 cache                │
│  17+ migrations · 20 tables across 3 functional groups     │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  APPLICATION LAYER                          │
│  Next.js 14 (App Router) · Vercel deployment               │
│  /admin (founder-only) · /tools/* · /denial-codes/*        │
└─────────────────────────────────────────────────────────────┘
```

---

## Tool Roles & Responsibilities

| Tool | Role | What It Controls | What It Does NOT Do |
| --- | --- | --- | --- |
| **GitHub** | Source of truth | All code, schemas, prompts, automations, migrations | Host documents/drafts |
| **Google Drive** | Review/export layer | Drafts, archive, review copies | Override GitHub as truth |
| **NotebookLM** | Intelligence synthesis | Synthesis over approved documents | Generate primary content directly |
| **Opal** | Packaging tool | Simple workflow packaging | Complex automation (use n8n) |
| **n8n** | Automation engine | 7 Phase 1 workflows + cache workflows | Replace human review gates |
| **OpenHands** | Bounded engineering | Scoped coding tasks, tests, migrations | Architecture decisions, autonomous merges |
| **Claude Cowork** | Normalization/execution engine | Task specs, canonical docs, migrations, briefs | Main content workhorse, engineering |
| **Supabase** | Database + auth | All persistent data, RLS, service role | Cache (Redis handles hot cache) |
| **Redis** | L1 hot cache | Fast lookup for denial codes, rights, appeal templates | Transactional user data |
| **Stripe** | Payments | Subscriptions, one-time purchases | Direct user data storage |
| **Anthropic claude-sonnet-4-6** | AI inference | All AI calls via generateLetter() | Direct SDK access from pages/components |
| **Vercel** | Deployment | Next.js hosting | Source of truth for any file |
| **Langfuse** | Observability | AI call monitoring, cost tracking | Governance or review decisions |

---

## Governance Chain

```
MA-PMP-001 (strategic doctrine — highest authority)
  ↓
MA-ARC-001 (constitutional implementation — Rule 2)
  ↓
MA-LCH-004 (launch checklist)
  ↓
MA-SEC-002 (security standards)
  ↓
MA-DAT-001 (data governance)
  ↓
Feature docs, supplementals, skill definitions
```

**Conflict resolution:** Any unresolved conflict between two MA-* docs → founder decision → recorded in Decision Log.

**OpenHands governance chain:**
```
PMP (what's allowed) → Founder (what to work on) → Claude Cowork (task spec)
  → OpenHands (codes) → PR → Founder review → Merge
```

---

## Three-Layer Caching System

| Layer | Technology | TTL | Purpose |
| --- | --- | --- | --- |
| L1 — Hot Cache | Redis | Denial: 90–180d; Rights: 30–90d | Sub-100ms response |
| L2 — Persistent | Supabase `cache_entries` | Same as L1 | Analytics, promotion source |
| L3 — SEO Static | Generated pages | Invalidated on updates | Zero marginal cost at scale |

**Promotion flywheel:** L2 hit frequency → promotion detector (n8n) → static SEO page generated → free organic traffic.

---

## Content Production System

**Registry-first architecture:** Every page is a typed object. Every section is a standalone answer block.

**Three clusters:**
- Cluster 1: Insurance Denials (appeal letters, denial codes, escalation)
- Cluster 2: Medical Bills (billing disputes, negotiation, financial assistance)
- Cluster 3: Patient Rights (hospital rights, discharge appeals, regulatory complaints)

**English-first doctrine:** All content starts in English. Spanish only when: views ≥500, clicks ≥10, signups ≥3, quality score threshold, or founder flag.

**Production pipeline:**
```
NotebookLM (intelligence) → Opal (packaging) → Claude Cowork (normalize)
  → GitHub (commit) → n8n (automate) → publication
```

---

## AI SEO Layer

Four-layer visibility stack ensuring content is citable by both humans and AI intermediaries:

1. **Retrieval-ready surfaces** — structured answer blocks, answer-first page structure
2. **Authority graph** — denial codes, states, insurers linked via schema.org entity graph
3. **Conversion routing** — every explanation has tool CTA; AI funnel: Citation → Page → Tool → Paid
4. **Measurement** — AI referral sessions, citation share, assisted branded search lift

**Infrastructure:** schema.org markup · `llms.txt` · segmented XML sitemaps · canonical URLs · review-date metadata

---

## 6 Canonical Functions

All AI output routes through these functions. Never call Anthropic SDK directly.

| Function | Trigger | YMYL Gate |
| --- | --- | --- |
| `generateAppealLetter()` | Denial code + insurer + state | Kate required |
| `generateDisputeLetter()` | Bill data + hospital + amount | Kate required |
| `explainDenialCode()` | CPT/HCPCS + denial code | Kate spot-check |
| `getPatientRights()` | State + insurer type | Kate + Attorney |
| `routeComplaint()` | Issue type + state + insurer | Kate spot-check |
| `generateBillingAnalysis()` | Uploaded document | Kate medical codes (Phase 2) |

Every function wraps through `trackedExecution()` middleware. **This is a launch blocker — not optional.**

---

## 7-Gate Chain on generateLetter()

All gates must pass in sequence. G1 and G6 are retroactive launch blockers.

1. Structured intake received (all required fields, types match schema)
2. PII Scrubber (zero matches, confidence ≥0.95)
3. Context Firewall (prompt contains only whitelisted fields for query type)
4. Anthropic API call
5. LQE evaluation (denial accuracy + YMYL + legal framing — all three must pass)
6. Disclaimer append (current version required)
7. Artifact state set (`review_required` Phase 1; `ready_for_delivery` Phase 2 LQE-pass)

---

## Phase 1 Launch Blockers

Nothing ships to public with AI output until ALL of these are live:

- [ ] `trackedExecution()` middleware wrapping every canonical function
- [ ] 7-gate chain on `generateLetter()` (MA-AUT-006 G6)
- [ ] LQE (Letter Quality Evaluator) running on all letter outputs (MA-AUT-006 G1)
- [ ] Context Firewall (`context-firewall.ts`) — currently missing from codebase
- [ ] 7 trust pages built and attorney-reviewed
- [ ] PII scrubber confirmed live on every Anthropic call path

---

## n8n Phase 1 Workflows (7)

| # | Workflow | Description |
| --- | --- | --- |
| 1 | Content intake | Validate → write to DB → notify |
| 2 | English draft generation | Query eligible items → call Claude → parse JSON → insert variants |
| 3 | Review routing | Determine review path → set status → notify reviewer |
| 4 | Publish prep | Prepare metadata → mark produced → export |
| 5 | Metrics logging | Manual weekly process (v1) |
| 6 | Spanish candidate trigger | Evaluate threshold → mark candidate |
| 7 | Packaging trigger | Find clusters → create assets → connect items |

**Cache workflows (6 additional — see MA-CACHE-001):** lookup · write-back · invalidation listener · promotion detector · cost-savings digest · stale sweeper

---

## Locked Build Order (Tier 1/2/3)

### Tier 1 — Foundation (Days 1–6)
Supabase schema · /admin route + founder auth · task queue · 20 seed content atoms · review state flow · OpenHands queue panel

### Tier 2 — Content Flywheel (Days 7–10)
English draft generation · review routing · publish prep · manual metrics entry · packaging candidate tagging

### Tier 3 — Intelligence & Scale (Days 11–14)
Metrics scoring · Spanish candidate detection · Spanish variant generation · ebook/toolkit cluster creation

---

## YMYL Compliance Requirements

| Gate | Requirement | Scope |
| --- | --- | --- |
| Kate clinical sign-off | Required | All letter templates, denial code content, appeal frameworks, adversarial test cases |
| Attorney review | Required | All 7 trust pages before publish; legal framing spot-check |
| LQE automated check | Required | Every `generateLetter()` call — launch blocker |
| AHP protocol | Required | Step 0 before every content review and Anthropic API call |
| Content audit log | Required | Migration 017 — all content creation logged |

---

## Google Drive Folder Structure

```
MyAdvocate/
  02 Architecture/      — technical specs, architecture docs
  03 SEO & Content/     — content drafts, SEO strategy
  04 Product/           — product specs, roadmaps
  05 Agents & Automation/ — agent specs, n8n workflow drafts
  06 Revenue & Growth/  — revenue models, growth strategy
  07 Compliance & Legal/ — YMYL docs, attorney review materials
  08 Social & Distribution/ — YouTube, Instagram, social content
  09 Financial/         — projections, financial models
  10 Design & UI/       — Figma exports, design tokens
  _Archive/             — processed supplemental documents
```

**Rule:** Google Drive is the review/export layer. GitHub is source of truth. Nothing in Drive overrides GitHub.

---

## Naming Convention

`[system]-[type]-[name]-v[number]`

Examples: `MA-ARC-001` · `MA-PMP-001-v30` · `myadvocate-content-denial-codes-v2`

---

**Aligned with:** MA-PMP-001 v30 · MA-ARC-001 · March 22, 2026
**Maintained by:** Sarsh Levine (founder) · Claude Cowork (normalization)
