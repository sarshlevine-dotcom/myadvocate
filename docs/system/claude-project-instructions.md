# MyAdvocate — Claude Project Instructions

## What This Is
MyAdvocate is an AI-powered patient advocacy platform. It gives everyday patients practical tools to navigate insurance denials, medical billing disputes, and healthcare access barriers. The product generates letters, phone scripts, agency complaint routes, and clear next steps. It does not provide legal or medical advice — it gives people the information and words they need to advocate for themselves.

**Brand posture:** adversarial toward abusive insurance and billing systems. The software stays calm, factual, and compliant.

---

## Current Status
- **Phase 1 MVP: SHIPPED** (2026-03-10) — denial decoder, appeal generator, medical bill dispute, HIPAA records request are all live
- **Now in Phase 2:** SEO content engine, automation pipeline, newsletter capture
- Live on Vercel. Supabase DB + Stripe billing + Anthropic API integrated. 37 commits.

---

## Stack
- **Frontend:** Next.js 14 (App Router), deployed on Vercel
- **Database:** Supabase (Postgres + RLS)
- **Auth:** Supabase Auth
- **Payments:** Stripe
- **AI:** Anthropic `claude-sonnet-4-6` — all calls via `generateLetter()` in `src/lib/generate-letter.ts`
- **Rate limiting:** Upstash Redis
- **Email/Newsletter:** Beehiiv (Phase 2)
- **Automation:** n8n (Phase 2)

---

## Hard Rules — Never Violate
- Never skip PII scrubbing before Anthropic API calls (`src/lib/pii-scrubber.ts`)
- Never call the Anthropic SDK directly — always use `generateLetter()`
- Never auto-release artifacts — `release_state` must pass through `review_required`
- Never add freeform text fields to the Case object
- Never commit `.env` files
- Never edit past migrations — create a new one instead
- Model string is `claude-sonnet-4-6` — no other string is correct

---

## Forbidden Outputs (applies to all generated content)
These must never appear in any user-facing document, letter, script, or article:
- "You should sue" / "consider litigation"
- "This was illegal" / "they broke the law"
- "You have a case" / "you have legal grounds"
- "You will win" / "your appeal will succeed"
- Settlement value or recovery amount estimates
- Anything implying MyAdvocate is acting as attorney, doctor, or insurer
- Contradicting a treating physician's documented recommendation

**What IS allowed:** citing statutes, describing patient rights, explaining what laws require insurers to do, describing appeal processes and timelines, providing negotiation frameworks.

---

## Repo Structure
- `src/app/` — pages + API routes (`admin/`, `cases/`, `denial-lookup/`, `documents/`, `generate/`, `stripe/`)
- `src/lib/` — `db/` (10 domain helpers), `supabase/`, `auth.ts`, `stripe.ts`, `rate-limit.ts`, `parse-document.ts`, `generate-letter.ts`, `pii-scrubber.ts`, `disclaimer.ts`
- `src/types/` — `domain.ts`, `supabase.ts`
- `src/components/` — Button, Input, FormField, Card, Alert, Nav
- `supabase/migrations/` — 11 migrations, append-only (never edit past ones)
- `automation/daily.js` — Notion sync + daily digest
- `.claude/skills/` — 32 skill definitions

---

## Skills Available (32 total)
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

**Governance chain (always runs):** `pii-sanitizer` → before any API call. `legal-disclaimer-enforcer` → before any user-facing delivery. `document-quality-checker` → final gate before document is returned.

---

## Phase 2 Priorities
1. ✅ Shared UI component library (Button, Input, FormField, Card, Alert, Nav)
2. ✅ `daily.js` automation (Notion sync, correct model string, env vars)
3. SEO content engine — target 20 articles in 60 days
4. Activate content-production-orchestrator pipeline
5. Beehiiv newsletter integration
6. n8n automation setup (event routing, retention flows)

---

## Decision Hierarchy
1. Compliance > conversion
2. Modularity > speed
3. Quality > volume (this is YMYL content — one accurate output beats ten plausible ones)
4. User protection > founder convenience

---

## For High-Level Questions
Invoke `myadvocate-master-operator` for: business status, weekly priorities, what to focus on, cross-skill coordination.
