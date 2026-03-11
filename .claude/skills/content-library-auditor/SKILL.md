---
name: content-library-auditor
description: Audits existing blog content and identifies refresh opportunities.
metadata:
  version: "1.0"
  category: infrastructure
  phase: 2
  domain: content
  ymyl: false
  model_tier: haiku
  compliance_review_required: false
  depends_on:
    - traffic-analytics
  triggers:
    - "audit content"
    - "which articles need updating"
    - "content decay"
    - "refresh old posts"
    - "review blog performance"
---

## Purpose

Evaluate the existing MyAdvocate content library and identify which articles need to be updated, expanded, or retired.

## Instructions

### Step 1 — Analyze article performance
For each article in the content library, assess:
- Current Google ranking position for target keyword
- Monthly organic traffic trend (growing, stable, declining)
- Click-through rate (CTR) from search
- Time on page and bounce rate
- Conversion rate to MyAdvocate tool use

### Step 2 — Identify outdated posts
Flag articles for refresh if:
- Published more than 12 months ago with no updates
- References outdated laws or regulations (e.g., pre-No Surprises Act billing articles)
- Ranking has dropped more than 5 positions in 60 days
- No longer matches current MyAdvocate product capabilities

### Step 3 — Recommend updates
For each flagged article, specify:
- What has changed (regulatory update, ranking drop, competitive gap)
- What to add (new section, updated statistics, new FAQ)
- Whether to expand (word count increase) or prune (remove outdated sections)
- Priority level (high/medium/low) based on traffic impact

## Output Format

1. **Content Library Summary:** [total articles, traffic overview]
2. **Articles Needing Immediate Refresh:** [high priority list]
3. **Articles to Watch:** [declining but not critical]
4. **Recommended Refresh Order:** [prioritized by traffic impact]

## Notes

- Invoke `content-refresh-engine` to execute the actual refresh after audit
- An article dropping below page 2 (position 20+) is a strong refresh signal
- Articles covering regulatory topics should be audited every 6 months
