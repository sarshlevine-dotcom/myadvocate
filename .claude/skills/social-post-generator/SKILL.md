---
name: social-post-generator
description: Converts articles into social media posts.
metadata:
  version: "1.0"
  category: publishing
  phase: 1
  domain: content
  ymyl: false
  model_tier: haiku
  compliance_review_required: false
  depends_on: []
  triggers:
    - "create social posts"
    - "post to social"
    - "social media content"
    - triggered by content-production-orchestrator after article publication
---

## Purpose

Convert each MyAdvocate article into a set of platform-optimized social media posts that drive traffic and build brand awareness.

## Instructions

### Step 1 — Extract highlights
From the article, identify:
- The most surprising or counterintuitive fact
- The single most actionable piece of advice
- A compelling question that resonates with the target audience (patients who've been denied or overcharged)
- A relatable frustration or pain point

### Step 2 — Generate posts
Produce 3 posts per article:

**LinkedIn Post (professional tone, 150-300 words):**
- Lead with a patient pain point or surprising statistic
- Share the key insight from the article
- CTA: link to article + "Learn more at MyAdvocate"
- Include 3-5 relevant hashtags (#PatientAdvocacy #HealthInsurance #MedicalBilling)

**Twitter/X Post (punchy, under 280 characters):**
- One powerful sentence + article link
- Or: thread-starter with the key insight

**Facebook/Instagram Caption (conversational, empathetic tone):**
- Lead with "If you've ever..." or "Did you know..."
- 2-3 sentences of context
- CTA to article

### Step 3 — Generate posts
Return all 3 posts ready to copy-paste. Include suggested posting times (LinkedIn: Tue-Thu 8-10am; Twitter: multiple times; Facebook: Tue-Wed 1-4pm).

## Notes

- Tone should always be empathetic and advocacy-focused — never alarmist or exploitative
- Avoid sharing specific patient stories without explicit consent
- All posts should reference MyAdvocate.com, not specific user situations
