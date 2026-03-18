# /write-prompt

Creates or revises a production Claude prompt for any MyAdvocate AI workflow.
All prompts produced here must be YMYL-compliant and Kate-reviewable before shipping.

## Usage
/write-prompt [canonical function or workflow name]

## Output Format

### Prompt: [function/workflow name]

**Canonical function:** generateAppealLetter / generateDisputeLetter / explainDenialCode / getPatientRights / routeComplaint / generateBillingAnalysis / [other]

**Intent:** One sentence — what must this prompt produce?

**Required inputs (structured):**
- List each structured field the prompt receives (never freeform narrative)
- Flag any field that could contain PII — confirm PII scrubber strips it before this prompt fires

**Forbidden language:**
- Never diagnose, treat, or recommend medical action
- Never provide legal advice or cite specific statutes as applying to the user's specific case
- Never guarantee outcomes ("you will win", "this will work")
- Never name specific attorneys or recommend specific providers
- Never store or repeat back sensitive diagnosis information

**Output rules:**
- Output must be actionable (specific next steps, not generic advice)
- Output must include disclaimer: "This is informational only and not legal or medical advice."
- Output must be under [X] tokens to stay within API cost model
- If denial code is present: validate against known payer patterns via GEO-03 pre-check before generating

**YMYL review gate:**
- Tier 1 (attorney + Kate), Tier 2 (Kate only), or Tier 3 (no clinical review)
- If Tier 1 or 2: prompt does not ship until Kate has reviewed and signed off

**Test cases:**
1. Standard input — expected output shape
2. Edge case: ambiguous denial code or missing field
3. PII scrubber test: confirm name/DOB/address stripped before model receives payload

**trackedExecution() note:**
- This prompt is wrapped in trackedExecution() — launch blocker if not confirmed
- Langfuse trace must capture: model used, token count, quality score, error state

**Prompt version:** v[N] — increment on every change, archive previous version in docs/prompts/

---
## MyAdvocate Rules This Command Enforces
- All prompts are YMYL — no exceptions
- Structured inputs only — no freeform narrative into AI model
- PII scrubber runs before every call
- trackedExecution() wraps every canonical function
- Kate sign-off required on Tier 1 and Tier 2 content before ship
- Prompt Registry (docs/prompts/) is the audit trail
