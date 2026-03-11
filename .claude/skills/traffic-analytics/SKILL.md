---
name: traffic-analytics
description: Analyzes SEO traffic performance and growth trends.
metadata:
  version: "1.0"
  category: infrastructure
  phase: 1
  domain: ops
  ymyl: false
  model_tier: haiku
  compliance_review_required: false
  depends_on: []
  triggers:
    - "analyze traffic"
    - "how is traffic growing"
    - "SEO performance report"
    - "search console data"
    - "monthly traffic"
---

## Purpose

Produce a structured analysis of MyAdvocate's organic search traffic performance to inform content and SEO strategy decisions.

## Instructions

### Step 1 — Analyze search console data
Review available data from Google Search Console (or provided data) covering:
- Total impressions and clicks (30-day and 90-day)
- Average position across all queries
- Top 10 performing pages by clicks
- Top 10 performing queries by impressions
- CTR by page and position

### Step 2 — Identify traffic changes
Flag significant changes:
- Pages gaining or losing more than 20% traffic month-over-month
- Keywords moving from page 2 to page 1 (breakthrough opportunities)
- Keywords dropping from top 10 to top 20+ (decay alert)
- New keywords appearing in top 50 (emerging opportunity)

### Step 3 — Recommend actions
Based on traffic analysis:
- **Quick wins:** Pages ranking 5-20 that could move to top 5 with minor optimization
- **Defend winners:** Top 3 pages — monitor for decay, keep updated
- **Investigate declines:** Pages losing traffic — flag for `content-library-auditor`
- **Content gaps:** High-impression/low-click queries indicating title/meta optimization needed

## Output Format

1. **Traffic Summary:** [30-day totals, trends vs prior period]
2. **Top Performers:** [pages and keywords driving most value]
3. **Alerts:** [significant changes requiring action]
4. **Recommended Actions:** [prioritized list with expected impact]

## Notes

- This skill operates on data provided by the founder or integrated analytics tools
- Without live data access, work with founder-provided Search Console exports
- Cross-reference with `content-library-auditor` for refresh decisions
