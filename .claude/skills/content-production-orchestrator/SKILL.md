---
name: content-production-orchestrator
description: Manages automated content generation workflows.
metadata:
  version: "1.0"
  category: automation
  phase: 1
  domain: content
  ymyl: true
  model_tier: sonnet
  compliance_review_required: true
  depends_on:
    - seo-topic-research
    - seo-article-generator
    - medical-accuracy-checker
    - legal-disclaimer-enforcer
    - social-post-generator
    - newsletter-generator
  triggers:
    - "run content pipeline"
    - "generate this week's content"
    - "content production run"
    - scheduled — weekly content production batch
---

## Purpose

Coordinate the end-to-end content production pipeline, from topic selection through publication-ready output.

## Instructions

### Step 1 — Generate topics
Invoke `seo-topic-research` to identify the highest-priority articles to produce this cycle. Default batch size: 3-5 articles.

### Step 2 — Produce drafts
For each selected topic, invoke `seo-article-generator` to produce a full article draft.

### Step 3 — Quality and compliance checks
For each draft:
1. Invoke `medical-accuracy-checker` — fix any FAIL or CAUTION items
2. Invoke `legal-disclaimer-enforcer` — append disclaimer

### Step 4 — Queue publication
Store completed articles in the content queue. Format for CMS publication (markdown with frontmatter). Mark as READY FOR REVIEW.

### Step 5 — Generate derived content
For each published article, invoke:
- `social-post-generator` — 3 social media posts (LinkedIn, Twitter/X, Facebook)
- `newsletter-generator` — newsletter segment for the next email send

## Output Format

**Content Production Run — [Date]**
- Articles Produced: [N]
- Articles Ready to Publish: [N]
- Articles Needing Human Review: [N] (list)
- Social Posts Generated: [N]
- Newsletter Segments: [N]

**Publication Queue:** [list of article titles with status]

## Notes

- NEVER auto-publish without founder review in Phase 0-1
- Flag any article where `medical-accuracy-checker` returned FAIL for founder review before publishing
- Archive all production runs in `sync.log` or equivalent
