---
name: newsletter-generator
description: Creates email newsletters from new content.
metadata:
  version: "1.0"
  category: publishing
  phase: 1
  domain: content
  ymyl: false
  model_tier: sonnet
  compliance_review_required: false
  depends_on: []
  triggers:
    - "create newsletter"
    - "email update"
    - "newsletter segment"
    - triggered by content-production-orchestrator after content batch
---

## Purpose

Generate email newsletter segments from newly published MyAdvocate content to grow and engage the subscriber list.

## Instructions

### Step 1 — Summarize articles
For each article in the current content batch, produce a 2-3 sentence summary that:
- Opens with the patient problem the article solves
- States the key insight or action the article provides
- Links to the full article

### Step 2 — Generate email
Produce a complete newsletter email with:

**Subject Line Options (3 variations):**
- Curiosity-driven: "Did you know you can appeal this?"
- Benefit-driven: "How to fight back against insurance denials"
- Question-driven: "Is your medical bill actually correct?"

**Email Body:**
- Greeting: "Hi [first name]," (personalization placeholder)
- Intro (2 sentences): What's in this issue + why it matters
- Article summaries (2-3 articles max per email)
- Tip of the week: One quick advocacy tip
- CTA: Link to MyAdvocate main tool
- Footer: Unsubscribe link, legal notice (placeholder)

### Step 3 — Generate email
Return the complete email HTML or plain text (specify which format is needed). Include all three subject line options for A/B testing.

## Notes

- Email cadence: weekly or bi-weekly in Phase 0-1
- Subscriber list: do not use newsletter as a spam vehicle — only send to opted-in subscribers
- Track open rate and click rate as key metrics
