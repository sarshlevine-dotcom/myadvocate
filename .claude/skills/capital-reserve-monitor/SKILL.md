---
name: capital-reserve-monitor
description: Tracks financial reserves and reinvestment strategy.
metadata:
  version: "1.0"
  category: founder-intelligence
  phase: 4
  domain: ops
  ymyl: false
  model_tier: haiku
  compliance_review_required: false
  depends_on: []
  triggers:
    - "check finances"
    - "reserve status"
    - "financial health"
    - "reinvestment capacity"
    - "how much runway do we have"
---

## Purpose

Maintain visibility into MyAdvocate's financial position and guide reinvestment decisions based on reserve levels.

## Instructions

### Step 1 — Calculate reserve levels
Given founder-provided financial data:
- Current bank/operating account balance
- Monthly recurring revenue (from Stripe)
- Monthly operating costs (Vercel, Supabase, Anthropic API, Upstash, domain, etc.)
- Net monthly cash flow (MRR minus costs)
- Months of runway at current burn rate

### Step 2 — Evaluate infrastructure spending
Break down costs:
- Vercel hosting (scales with traffic)
- Supabase (database + auth)
- Anthropic API (per-letter usage costs)
- Upstash Redis (rate limiting)
- Third-party tools (analytics, SEO tools)

### Step 3 — Recommend reinvestment
Based on reserve levels:
- **Pre-revenue / early stage:** Minimize spend, focus on organic growth
- **First revenue:** Reinvest 20-30% into content production tools or SEO tooling
- **Consistent MRR:** Evaluate paid acquisition channels or product development
- **Scale stage:** Infrastructure scaling and automation investment

## Output Format

**Financial Status — [Date]**
- MRR: $[amount]
- Monthly Costs: $[amount]
- Net Monthly: $[+/- amount]
- Reserves: $[amount] ([N] months runway)
- Reinvestment Capacity: $[amount/month]
- Recommendation: [specific action]

## Notes

- This skill works with founder-provided data — no direct Stripe/bank integration in Phase 0
- The goal is sustainability first, growth second
- Alert if runway drops below 6 months
