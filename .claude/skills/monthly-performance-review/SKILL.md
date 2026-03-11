---
name: monthly-performance-review
description: Evaluates business metrics and operational performance.
metadata:
  version: "1.0"
  category: founder-intelligence
  phase: 0
  domain: ops
  ymyl: false
  model_tier: sonnet
  compliance_review_required: false
  depends_on:
    - traffic-analytics
    - content-library-auditor
    - capital-reserve-monitor
    - gamification-xp-engine
  triggers:
    - "monthly review"
    - "monthly performance"
    - "business review"
    - "how did we do this month"
    - "end of month report"
---

## Purpose

Produce a comprehensive monthly performance review of MyAdvocate across all key dimensions, enabling data-driven decisions for the month ahead.

## Instructions

### Step 1 — Analyze traffic
Via `traffic-analytics`:
- Total organic sessions this month vs. last month
- New keywords entering top 10
- Articles gaining/losing significant traffic
- Overall ranking position trend

### Step 2 — Analyze revenue
Review Stripe data (from Supabase):
- New subscriptions this month
- Churn (cancellations)
- MRR (monthly recurring revenue)
- Trial-to-paid conversion rate
- Revenue vs. operating costs

### Step 3 — Evaluate growth
- Articles published this month
- Content library total size
- Automation pipeline health (daily.js run rate)
- SEO authority growth indicators

### Step 4 — Identify wins and risks
**Wins:** What worked better than expected?
**Risks:** What is trending in the wrong direction?
**Unknowns:** What do we not have enough data on yet?

### Step 5 — Update gamification progress
Invoke `gamification-xp-engine` to calculate XP earned this month and update milestone progress.

## Output Format

**MyAdvocate Monthly Review — [Month Year]**

**Traffic:** [sessions, growth%, top articles]
**Revenue:** [MRR, new subs, churn, net change]
**Content:** [articles published, library size]
**Automation:** [pipeline health, sync runs]
**Wins This Month:** [2-3 specific wins]
**Risks to Address:** [2-3 specific concerns]
**Next Month Priority:** [single most important focus]
**Milestone Progress:** [XP and gamification update]

## Notes

- Run on the 1st of each month covering the prior month
- Compare against Phase targets from the build plan
- Archive each review in `docs/monthly-reviews/YYYY-MM.md`
