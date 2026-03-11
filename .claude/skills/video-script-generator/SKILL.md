---
name: video-script-generator
description: Converts articles into YouTube or TikTok scripts.
metadata:
  version: "1.0"
  category: publishing
  phase: 2
  domain: content
  ymyl: true
  model_tier: sonnet
  compliance_review_required: true
  depends_on: []
  triggers:
    - "create video script"
    - "YouTube script"
    - "TikTok script"
    - "short form video"
    - triggered by content-production-orchestrator for video content batch
---

## Purpose

Transform MyAdvocate articles into engaging short-form video scripts for YouTube and TikTok to expand reach and organic discovery.

## Instructions

### Step 1 — Extract story arc
From the article, identify:
- The hook (the patient's frustrating problem — open with this)
- The revelation (the key insight most people don't know)
- The solution (what MyAdvocate helps the user do)
- The CTA (how to use MyAdvocate right now)

### Step 2 — Generate script

**TikTok/Short-form script (60-90 seconds):**
- Hook (0-3 sec): "If your insurance denied your claim, watch this."
- Problem (3-20 sec): Describe the pain point vividly
- Insight (20-50 sec): The key thing they need to know
- CTA (50-60 sec): "Go to MyAdvocate.com — link in bio"
- Format: Conversational, direct-to-camera, one idea per script

**YouTube script (3-5 minutes):**
- Hook (0-15 sec): Open with the problem
- Intro (15-30 sec): "In this video I'll show you..."
- Content sections (based on article H2s)
- CTA mid-roll: Subscribe + MyAdvocate link
- Outro (30 sec): Recap + subscribe + related video suggestion
- Format: Slightly more formal, but still patient-advocate voice

## Output Format

Return two scripts per article:
1. TikTok/Reels script (with timestamp markers)
2. YouTube script (with section headers and estimated timing)

## Notes

- Video content is Phase 2+ priority — SEO and product come first
- Scripts should feel authentic, not corporate — Sarsh speaking as a patient advocate
- Always end with a clear, single CTA (not multiple asks)
