---
name: medical-accuracy-checker
description: Validates health information accuracy before publication.
metadata:
  version: "1.0"
  category: governance
  phase: 0
  domain: compliance
  ymyl: true
  model_tier: sonnet
  compliance_review_required: true
  depends_on: []
  triggers:
    - internal — called by seo-article-generator and content-refresh-engine before publication
---

## Purpose

Quality gate for medical and clinical claims in MyAdvocate content. Prevent the publication of inaccurate health information.

## Instructions

### Step 1 — Verify claims
For each medical/clinical claim in the document, assess:
- Is this claim consistent with current mainstream medical consensus?
- Is this supported by authoritative sources (NIH, CDC, major specialty societies)?
- Is this claim time-sensitive (e.g., drug approval status, treatment guidelines that change)?
- Is this claim being stated as fact vs. as something "some providers recommend"?

### Step 2 — Check sources
Verify that any statistical claims have credible sourcing:
- Government sources (CMS.gov, HHS.gov, CDC.gov, NIH.gov)
- Major medical journals (NEJM, JAMA, BMJ, Lancet)
- Specialty society guidelines (AHA, ACS, AAN, etc.)
- NOT: for-profit insurance company sites, patient advocacy blogs without sourcing

### Step 3 — Flag issues
Produce a list of:
- **FAIL:** Claims that are factually incorrect — must be corrected before publication
- **CAUTION:** Claims that are technically accurate but misleading without context — recommend adding nuance
- **VERIFY:** Claims that may be outdated — recommend fact-checking against a current source
- **PASS:** Claims verified as accurate

## Output

Returns a structured review:
- Overall status: PASS / PASS WITH CHANGES / FAIL
- Specific flagged claims with recommended corrections
- Verified citations to attach to the document

## Notes

- This skill does not replace human medical review for high-stakes content
- When in doubt, lean toward "consult your doctor" rather than making a specific claim
- Flag any content that could lead a patient to delay seeking medical care
