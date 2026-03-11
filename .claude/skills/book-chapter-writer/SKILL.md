---
name: book-chapter-writer
description: Generates chapters for nonfiction books.
metadata:
  version: "1.0"
  category: book-automation
  phase: 3
  domain: content
  ymyl: true
  model_tier: sonnet
  compliance_review_required: false
  depends_on:
    - book-outline-generator
    - medical-accuracy-checker
  triggers:
    - "write book chapter"
    - "chapter draft"
    - triggered by book-outline-generator after outline approval
---

## Purpose

Generate complete nonfiction book chapters following the approved outline, in a consistent author voice.

## Instructions

### Step 1 — Write chapter draft
Following the approved chapter outline, write a complete chapter draft:
- Target length: 3,000-5,000 words per chapter
- Voice: First-person plural ("we" as MyAdvocate) or third-person depending on the book's established voice
- Tone: Authoritative but accessible, empathetic, action-oriented
- Structure: Chapter intro → main sections → key takeaway box → chapter summary → "Take Action" section linking to MyAdvocate tool

### Step 2 — Apply editorial style
- Short paragraphs (4-5 sentences max)
- Use numbered lists for processes, bullet lists for options
- Include 1-2 real-world scenarios per chapter (anonymized)
- Avoid jargon — define any technical term on first use
- Include chapter-opening quote (patient advocacy themed)

### Step 3 — Add MyAdvocate integration points
Within each chapter, naturally integrate references to MyAdvocate:
- "Use MyAdvocate's appeal letter generator to..."
- "You can decode your denial code instantly at..."
- Never feel like advertising — frame as a practical tool recommendation

## Output Format

Complete chapter in markdown format including:
- Chapter number and title
- Opening quote
- Chapter body with H2/H3 structure
- "Key Takeaway" box
- "Take Action with MyAdvocate" section
- Chapter summary (3-5 bullet points)

## Notes

- Invoke `medical-accuracy-checker` after writing any chapter with clinical claims
- Each chapter should stand alone — readers may jump around non-linearly
- Archive all chapter drafts in `docs/book/chapters/`
