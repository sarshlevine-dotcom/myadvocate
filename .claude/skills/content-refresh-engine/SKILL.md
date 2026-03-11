---
name: content-refresh-engine
description: Updates older articles to maintain SEO relevance.
metadata:
  version: "1.0"
  category: automation
  phase: 2
  domain: content
  ymyl: true
  model_tier: sonnet
  compliance_review_required: true
  depends_on:
    - content-library-auditor
    - medical-accuracy-checker
    - legal-disclaimer-enforcer
  triggers:
    - "refresh article"
    - "update old content"
    - "content decay fix"
    - triggered by content-library-auditor when article flags refresh
---

## Purpose

Systematically update existing MyAdvocate articles to restore or improve their search rankings and accuracy.

## Instructions

### Step 1 — Identify aging content
Receive the flagged article list from `content-library-auditor`. For each article, determine the refresh type needed:
- **Regulatory update:** New law or rule change affects the article
- **Ranking recovery:** Article dropped in rankings — needs optimization
- **Expansion:** Article is thin and could rank better with more depth
- **Pruning:** Article has outdated sections that should be removed

### Step 2 — Regenerate sections
For regulatory updates: Rewrite affected sections with current information and updated citations.
For ranking recovery: Update H2 structure, improve keyword density in key positions, strengthen the CTA.
For expansion: Add new FAQ section, deepen one H2 section with more specific guidance.
For pruning: Remove outdated information, update publication date.

### Step 3 — Re-validate
After refreshing:
- Invoke `medical-accuracy-checker` to validate any medical claims in updated sections
- Invoke `legal-disclaimer-enforcer` to verify disclaimer is current and present

## Output Format

**Article Refresh — [Article Title] — [Date]**
- Refresh Type: [type]
- Changes Made: [summary of updates]
- Sections Updated: [list]
- Medical Review Status: [PASS/FAIL]
- Ready to Republish: [yes/no]

## Notes

- Update the article's "last reviewed" date in the CMS frontmatter
- Google rewards freshness signals — even minor updates help
- Priority order for refresh: highest-traffic articles first
