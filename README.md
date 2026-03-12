# MyAdvocate

> "The insurance companies have lawyers. You have MyAdvocate."

AI-powered patient advocacy platform. Gives everyday Americans practical, legally grounded tools to navigate insurance denials, medical billing disputes, and healthcare access barriers.

**Status:** Phase 1 MVP live on Vercel · Phase 2 active (content engine, SEO growth, agent deployment)

---

## What It Does

Four tools, live:

| Tool | What It Does |
|---|---|
| Insurance Denial Fighter | Analyzes denial → generates appeal letter citing real federal + state law |
| Medical Bill Dispute Tool | Guided wizard → AI dispute letter → negotiation script → complaint template |
| HIPAA Records Request | Generates HIPAA-compliant records request with deadline enforcement |
| Denial Decoder | Paste a denial code → plain-language explanation + recommended next action (free, no signup) |

---

## Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 14 (App Router), Vercel |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth |
| Payments | Stripe |
| AI | Anthropic (Haiku default, Sonnet for document upload cases) |
| Caching / Rate limiting | Upstash Redis |
| Email | Beehiiv (Phase 2) |
| Automation | n8n (Phase 2) |

---

## Architecture Principles

- **PII scrubbing before every API call** — `src/lib/pii-scrubber.ts`
- **All AI calls through `generateLetter()`** — `src/lib/generate-letter.ts` (never bypass)
- **No auto-release of artifacts** — all outputs pass through `review_required` state
- **Budget cap: $150/month** — enforced via Upstash Redis tripwires in `src/lib/budget-monitor.ts`
- **Haiku default, Sonnet reserved** — Sonnet only for document upload / complex cases
- **Context registry** — `/context_registry/` JSON files are the agent intelligence layer (not the DB)

---

## Getting Started

```bash
npm install
cp .env.example .env.local
# Fill in Supabase, Stripe, Anthropic, Upstash, and Beehiiv keys
npm run dev
```

**Supabase (local):**
```bash
supabase start
supabase db push
supabase gen types typescript --local > src/types/supabase.ts
```

**Install git pre-commit hook (run once):**
```bash
bash scripts/install-hooks.sh
```

---

## Repo Structure

```
src/
  app/          Next.js App Router pages and API routes
  lib/          Core utilities — generate-letter.ts, pii-scrubber.ts, budget-monitor.ts, disclaimer.ts
  components/   Shared UI — Button, Input, FormField, Card, Alert, Nav
  types/        domain.ts, supabase.ts

supabase/
  migrations/   15 migrations (append-only — see supabase/migrations/CLAUDE.md)
  seed/         Denial codes and resource routes

context_registry/   Agent intelligence layer — 8 JSON registries (MA-CTX-001)
docs/               Canonical documents
  pmp/              PMP v21 (current)
  cost/             MA-COST-001 (API cost architecture)
  security/         MA-SEC-002 (24 controls)
  agents/           MA-AGT-001 (external agent integration)
  context/          MA-CTX-001 (context registry spec)
  social/           MA-SOC-002 (patient story engine)

automation/     daily.js — Notion sync + daily digest
.claude/        skills/, agents/, hooks/
```

---

## Canonical Docs

| ID | Title | Location |
|---|---|---|
| MA-PMP-001 v21 | Project Management Plan | `docs/pmp/MyAdvocate_PMP_v21.docx` |
| MA-LCH-004 | Launch Truth (Phase 1 scope) | Notion / Google Drive |
| MA-SEC-002 | Security Checklist (24 controls) | `docs/security/` |
| MA-COST-001 | API Cost Architecture | `docs/cost/` |
| MA-CTX-001 | Context Registry Specification | `docs/context/` |
| MA-SOC-002 | Patient Story Engine | `docs/social/` |
| MA-AGT-001 | External Agent Integration Plan | `docs/agents/` |
| MA-AHP-001 | Anti-Hallucination Protocol | Notion Agent Registry |

**Read `SYSTEM.md` first. Then `CLAUDE.md`. These govern all engineering decisions.**

---

## Key Commands

```bash
npm run dev          # start dev server
npm test             # run tests (Vitest)
npm run lint         # ESLint check
supabase db push     # apply migrations
```

---

## Phase 2 Priorities

1. Install external agents (GEO-01/02/03, CNT-01) — MA-AGT-001
2. Scaffold `/context_registry/` — 8 JSON files — MA-CTX-001
3. Deploy Supabase migration 016 (scrub_records) — MA-SOC-002
4. Launch SEO content engine — 20 GEO-optimized articles in 60 days
5. Activate content-production-orchestrator pipeline
6. Beehiiv newsletter capture

---

*MyAdvocate is a private project under active development. Not open source.*
