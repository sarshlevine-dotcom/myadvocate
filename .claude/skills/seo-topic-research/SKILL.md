---
name: seo-topic-research
description: Identifies high-value healthcare search topics for SEO content. Use when planning blog content or SEO strategy.
metadata:
  version: "1.0"
  category: infrastructure
  phase: 1
  domain: content
  ymyl: true
  model_tier: haiku
  compliance_review_required: false
  depends_on:
    - traffic-analytics
  triggers:
    - "find SEO topics"
    - "what should we write about"
    - "content opportunities"
    - "keyword research"
    - "identify SEO opportunity"
---

## Purpose

Identify the highest-value healthcare advocacy search topics that MyAdvocate should target for organic traffic growth.

## Instructions

### Step 1 — Analyze keyword data
Focus on healthcare advocacy search queries with these characteristics:
- High intent (user needs help, not just information)
- Moderate competition (not dominated by WebMD/Mayo Clinic)
- Long-tail specificity (e.g., "how to appeal anthem blue cross denial for therapy" not just "health insurance")
- Patient-perspective phrasing (as a patient would search, not as a clinician)

### Step 2 — Identify clusters
Group related keywords into topic clusters:
- **Insurance Appeals Cluster:** Appeal letters, denial codes, appeal deadlines, peer review
- **Medical Billing Cluster:** Surprise bills, itemized bills, billing errors, negotiation
- **Patient Rights Cluster:** State rights, HIPAA, balance billing, external review
- **Elder Care Cluster:** Nursing home complaints, ombudsman, elder abuse
- **Condition-Specific:** Denial of mental health, cancer treatment, rare disease coverage

### Step 3 — Recommend article topics
For each cluster, recommend 3-5 specific article titles optimized for:
- Target keyword in H1
- Search intent alignment
- Ability to generate a clear, actionable MyAdvocate use case

### Step 4 — Prioritize by opportunity score
Rank recommendations by:
1. Estimated search volume
2. Competition level (lower = better for early phase)
3. Conversion potential (does it lead to using MyAdvocate?)

## Output Format

1. **Top Clusters Identified:** [3-5 clusters]
2. **Recommended Articles by Cluster:** [3-5 titles each]
3. **Priority Pick:** [single highest-opportunity article to write next]
4. **Traffic Projection:** [rough monthly visitor estimate at ranking position 3]

## Notes

- Phase 1 target: 20-40 foundational articles covering primary clusters
- Focus on long-tail before broad terms — authority builds over time
- Each article should naturally lead to a MyAdvocate tool use case
