---
name: seo-article-generator
description: Generates SEO-optimized healthcare articles. Use when creating educational content for the MyAdvocate blog.
metadata:
  version: "1.0"
  category: infrastructure
  phase: 1
  domain: content
  ymyl: true
  model_tier: sonnet
  compliance_review_required: true
  depends_on:
    - seo-topic-research
    - medical-accuracy-checker
    - legal-disclaimer-enforcer
  triggers:
    - "write blog post"
    - "create article"
    - "generate content"
    - "write about [topic]"
---

## Purpose

Produce high-quality, SEO-optimized healthcare advocacy articles that rank in search and drive conversions to MyAdvocate tools.

## Instructions

### Step 1 — Generate outline
Before writing, produce an outline with:
- Primary keyword (in H1 and first 100 words)
- 3-5 H2 sections covering the topic comprehensively
- FAQ section (targets "People Also Ask" featured snippets)
- CTA section linking to relevant MyAdvocate tool

### Step 2 — Write article
Produce the full article following these standards:
- **Length:** 1,200-2,000 words for foundational articles; 800-1,200 for supporting cluster articles
- **Tone:** Empathetic, clear, patient-advocate perspective. Not clinical. Not alarmist.
- **Reading level:** 8th grade or below (Flesch-Kincaid)
- **Structure:** Short paragraphs (3-4 sentences max), frequent subheadings, bullet lists where appropriate
- **First paragraph:** Hook with the patient's problem, not background information
- **Internal links:** Reference other relevant MyAdvocate articles where applicable
- **CTA:** End every article with a clear call to action for the relevant MyAdvocate tool

### Step 3 — Optimize headings
- H1: Include primary keyword exactly as searched
- H2s: Include related keywords and question phrases
- Meta description: 150-160 characters, include primary keyword, describe the value

### Step 4 — Insert citations
Link to authoritative sources: CMS.gov, HHS.gov, state insurance commissioner sites, peer-reviewed journals for medical claims. Never cite for-profit insurance company FAQs.

## Output Format

Full article in markdown format including:
- Meta description (for CMS input)
- H1 title
- Article body with H2/H3 structure
- FAQ section
- CTA block
- Suggested internal links

## Compliance Notes

- Invoke `medical-accuracy-checker` before finalizing any article with medical claims
- Invoke `legal-disclaimer-enforcer` to append article-level disclaimer
- NEVER recommend specific treatments — focus on rights, processes, advocacy
