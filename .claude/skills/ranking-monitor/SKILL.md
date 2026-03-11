---
name: ranking-monitor
description: Tracks search rankings for target keywords.
metadata:
  version: "1.0"
  category: automation
  phase: 1
  domain: content
  ymyl: false
  model_tier: haiku
  compliance_review_required: false
  depends_on:
    - traffic-analytics
  triggers:
    - "check rankings"
    - "keyword positions"
    - "ranking report"
    - "are we ranking for"
    - scheduled — weekly ranking check
---

## Purpose

Monitor MyAdvocate's keyword ranking positions and surface actionable insights about SEO performance trends.

## Instructions

### Step 1 — Monitor rankings
Track ranking positions for the target keyword list across:
- Primary keywords (high priority — insurance appeal, denial code explanation, etc.)
- Cluster keywords (medium priority — article-level targets)
- Brand keywords (myadvocate, myadvocate.com)
- Competitor keywords (what related tools rank for)

### Step 2 — Identify declines
Flag any target keyword that has:
- Dropped 5+ positions in the past 30 days
- Fallen below position 20 (page 2)
- Lost more than 20% click volume month-over-month

### Step 3 — Surface opportunities
Identify:
- Keywords moving from position 11-20 into page 1 (near-breakthrough)
- New keywords entering the top 50 organically
- Featured snippet opportunities (question-format queries ranking 2-5)

## Output Format

**Ranking Report — [Date]**

**Top 10 Keywords:** [keyword | position | trend]
**Alert — Declines:** [keywords dropping significantly]
**Opportunity — Near-Breakthroughs:** [keywords approaching page 1]
**Recommended Actions:** [1-3 specific optimization actions]

## Notes

- This skill works with founder-provided Search Console data or manual position tracking in early phases
- Weekly monitoring is sufficient in Phase 0-1; daily monitoring warranted at Phase 3+
- Cross-reference declines with `content-library-auditor` to trigger refresh workflows
