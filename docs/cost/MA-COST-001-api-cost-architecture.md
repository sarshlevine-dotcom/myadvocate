# MA-COST-001: API Cost Architecture & Spend Control

**Permanent ID**: MA-COST-001
**Family**: MA-COST (Cost & Resource Management)
**Role**: Canonical
**Authority Status**: Primary
**Canonical Tier**: Primary
**Key Use**: API spend control, model selection, output sizing, budget tripwires
**Related IDs**: MA-SEC-002 (Security Checklist), MA-LCH-004 (Launch Truth), CLAUDE.md

---

## Purpose

This document governs all decisions about how the MyAdvocate platform consumes AI API
resources. It establishes the model routing rules, output caps, budget thresholds,
caching strategy, and the 3-bucket classification framework for every AI call.

**Use this when:**
- Designing any new feature that calls `generateLetter()` or any AI endpoint
- Evaluating whether a call should be live AI, cached, or static/template
- Choosing which model tier to use for a given letter type or task
- Investigating API spend or responding to a budget alert

---

## MA-COST-001-A: Core Principles

1. **API spend is a hard-controlled variable, not a surprise expense.** $150/month cap,
   enforced by Redis budget tripwires in `src/lib/budget-monitor.ts`.

2. **Haiku is the default workhorse. Sonnet is reserved.** Use Haiku unless a document
   is being analyzed or the case has been explicitly flagged complex. Never use Sonnet
   because it would produce "nicer" output.

3. **One generation call per user flow.** Precompute structure first, then do a single
   generation call. Multi-step hidden chains for simple actions are the primary cost leak.

4. **Cache > static template > live AI.** Denial code explanations, rights summaries,
   common insurer explanations, and standard next steps should never reach the API.

5. **Output length is a cost lever.** Do not let the model write essays when the user
   needs a letter. Hard caps are enforced per letter type in `generateLetter()`.

---

## MA-COST-001-B: Model Routing Rules

All model routing lives in `src/lib/generate-letter.ts`. The routing table:

| Letter Type         | No Document | With Document | Rationale                            |
|---------------------|-------------|---------------|--------------------------------------|
| `denial_appeal`     | haiku       | sonnet        | Doc analysis needs stronger reasoning |
| `bill_dispute`      | haiku       | sonnet        | Doc analysis needs stronger reasoning |
| `hipaa_request`     | haiku       | haiku         | Highly templated; Haiku sufficient   |
| `negotiation_script`| haiku       | haiku         | Short output; Haiku sufficient        |

**Decision rule for new letter types:**
- No uploads + structured form inputs → haiku
- Short / highly templated output → haiku
- Document upload or ambiguous case → sonnet
- Attorney-routing or rare complex reasoning → sonnet only when explicitly triggered

**Model strings (as of 2026-03-12):**
- Haiku: `claude-haiku-4-5-20251001`
- Sonnet: `claude-sonnet-4-6`

Update these in `MODEL_STRINGS` in `generate-letter.ts` when Anthropic releases new versions.

---

## MA-COST-001-C: Output Caps

Hard `max_tokens` limits enforced in `OUTPUT_CONFIG` in `generate-letter.ts`:

| Letter Type          | max_tokens | Target length      |
|----------------------|------------|--------------------|
| `denial_appeal`      | 600        | ~400–500 words     |
| `bill_dispute`       | 500        | ~350–400 words     |
| `hipaa_request`      | 400        | ~250–300 words     |
| `negotiation_script` | 200        | strictly <150 words|

These are hard limits. If an output type consistently hits its cap and quality suffers,
re-evaluate the prompt structure before raising the cap.

---

## MA-COST-001-D: Budget Tripwires

Implemented in `src/lib/budget-monitor.ts`. Redis counters track per-day and per-month
spend. Thresholds:

| Level      | Threshold | Monthly $ | Action                                          |
|------------|-----------|-----------|--------------------------------------------------|
| `ok`       | 0–50%     | $0–$75    | Normal operation                                 |
| `warning`  | 50–80%    | $75–$120  | Console warning logged; no action yet            |
| `review`   | 80–100%   | $120–$150 | Console warn; manually review spend immediately  |
| `throttle` | 100%+     | $150+     | Console error; disable non-essential AI features |

**Phase 2**: Replace console alerts with n8n webhook → email/Slack notification.

Cost model used for estimation (conservative; update if Anthropic changes pricing):
- Haiku:  $0.80/M input tokens, $4.00/M output tokens
- Sonnet: $3.00/M input tokens, $15.00/M output tokens

---

## MA-COST-001-E: 3-Bucket Classification Framework

Every AI call in the system should be classified as one of:

### Bucket 1: Live AI (required for every call)
Personalized outputs where structured user data drives the generation. These should
go through `generateLetter()` with the appropriate model tier.

- Final personalized appeal letters
- Personalized bill dispute letters
- Document upload analysis (Phase 2)
- Complex state-specific edge cases

### Bucket 2: Cache-first (serve from Redis or DB; regenerate only on miss)
Outputs that are functionally identical for the same inputs. These should be cached
aggressively — Redis is already deployed.

- Denial Decoder explanations by code (already static DB lookups ✅)
- Rights summaries by state/issue type (Phase 2 — add caching before shipping)
- Common negotiation script templates by scenario
- Standard next steps by denial category

### Bucket 3: Static / template (no AI at all)
Content that does not require inference. Replace with DB records, templates, or
hard-coded responses.

- Denial code plain-language explanations → already served from DB ✅
- Resource connector outputs → static links ✅
- FAQ-style education content → CMS or hard-coded
- Complaint routing menus → static routing logic

**Target:** 30–60% of all API calls should move to Bucket 2 or 3 after the
caching layer is built (Phase 2).

---

## MA-COST-001-F: Prompt Efficiency Rules

1. **Disclaimers, boilerplate, and citation blocks go in post-processing**, not the
   prompt. `appendDisclaimer()` already handles this correctly — never resend in the
   system prompt.

2. **Only send the fields needed for the exact output.** PII scrubbing already enforces
   this for privacy; enforce it for cost too. Do not send entire case objects.

3. **Prompt length audit before each new letter type.** Before shipping a new tool,
   count the prompt tokens for a typical case. Flag anything over 400 input tokens
   for a structured form submission.

---

## MA-COST-001-G: Per-Feature Cost Tracking

Token data (`input_tokens`, `output_tokens`, `model_used`) is logged with every
`letter_generated` event in `metric_events` (migration 015). This enables weekly
cost-per-feature reports by querying:

```sql
SELECT
  tool_name,
  model_used,
  COUNT(*)                                        AS calls,
  SUM(input_tokens)                               AS total_input_tokens,
  SUM(output_tokens)                              AS total_output_tokens,
  -- haiku: $0.0008/1K input, $0.004/1K output
  -- sonnet: $0.003/1K input, $0.015/1K output
  ROUND(
    SUM(CASE WHEN model_used = 'haiku'  THEN input_tokens  * 0.0000008 ELSE 0 END) +
    SUM(CASE WHEN model_used = 'haiku'  THEN output_tokens * 0.000004  ELSE 0 END) +
    SUM(CASE WHEN model_used = 'sonnet' THEN input_tokens  * 0.000003  ELSE 0 END) +
    SUM(CASE WHEN model_used = 'sonnet' THEN output_tokens * 0.000015  ELSE 0 END),
    4
  )                                               AS estimated_cost_usd
FROM metric_events
WHERE event_type = 'letter_generated'
  AND created_at >= date_trunc('month', NOW())
GROUP BY tool_name, model_used
ORDER BY estimated_cost_usd DESC;
```

Run this weekly. Kill or redesign any feature with a high cost-to-conversion ratio.

---

## MA-COST-001-H: Deferred Items (Parking Lot)

The following cost controls are explicitly deferred to later phases:

| Item                               | Phase | Why Deferred                                        |
|------------------------------------|-------|-----------------------------------------------------|
| Redis response caching layer       | 2     | Need usage volume to know what's worth caching      |
| Partial regeneration on retry      | 2     | Requires document upload feature (Phase 2) first    |
| Batch content pipeline cost rules  | 2     | Tied to SEO content engine rollout                  |
| n8n webhook for budget alerts      | 2     | Phase 2 automation setup                            |
| RAG architecture evaluation        | 3     | Requires content volume + proven product patterns   |

---

## MA-COST-001-I: Free Tier Cost Rules

The free tier must be nearly zero cost. Acceptable free-tier patterns:
- Denial Decoder lookup → zero AI cost (DB only) ✅
- Static resource pages → zero AI cost ✅
- Coming-soon / waitlist capture → zero AI cost ✅

Unacceptable free-tier patterns:
- Any live AI generation call
- Any document parsing call
- Any model inference that costs real tokens

Free tier should attract users and qualify intent, not burn tokens.

---

## Weekly Cost Review Checklist

Run every Monday:
- [ ] Check Redis budget status: `getBudgetStatus()` from `budget-monitor.ts`
- [ ] Run per-feature cost query (MA-COST-001-G) against `metric_events`
- [ ] Review any `[BUDGET:WARNING]` or `[BUDGET:REVIEW]` log entries from the past week
- [ ] Check model distribution: what % of calls used Sonnet vs. Haiku?
- [ ] If any feature has cost-to-conversion ratio > 2x average: flag for redesign

---

**Document Status**: Canonical — ACTIVE
**Created**: 2026-03-12
**Next Review**: Before Phase 2 launch (caching layer implementation)
**Authority**: MA-COST-001 governs all AI spend decisions
