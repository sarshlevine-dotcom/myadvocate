# /review-privacy

Audits one workflow or feature against the four-layer privacy architecture.
Run this before any feature that touches user data ships.

## Usage
/review-privacy [workflow or feature name]

## Output Format

### Privacy Audit: [workflow name]

**Layer 1 — Context Firewall:**
- Does the user input arrive via structured form fields only? (YES / NO — if NO, flag as blocker)
- Are there any freeform text fields that could contain diagnoses, names, or medical history? (List them)
- Fix required: [describe fix if applicable]

**Layer 2 — PII Scrubber:**
- Does a server-side PII scrubber run before the payload reaches the AI model? (YES / NO — if NO, flag as blocker)
- Fields that must be stripped: name, DOB, address, insurance ID, phone, email, any field containing the word "diagnosis"
- Confirm: the AI model never receives raw PII
- Fix required: [describe fix if applicable]

**Layer 3 — Data Minimization:**
- What is stored after this workflow completes? List each data type.
- Are specific diagnoses being stored? (Must be category-level only — Chronic Navigator Phase 4+ exception only)
- Are insurance ID numbers being stored? (Must not be)
- Fix required: [describe fix if applicable]

**Layer 4 — Access Controls:**
- Does Supabase RLS policy prevent users from accessing other users' data? (YES / NO)
- Does the founder review queue see only anonymized output metadata? (YES / NO)
- Does the owner reporting layer (Google Sheets) only receive aggregated metrics? (YES / NO — never user records)
- Fix required: [describe fix if applicable]

**Attorney referral check:**
- Does this workflow involve routing to an attorney? (YES / NO)
- If YES: is the formal privacy addendum in place before any referral data is transmitted? (Must be YES before ship)

**Overall verdict:**
- PASS: All four layers confirmed, no blockers
- FAIL: [list blockers — workflow cannot ship until resolved]
- CONDITIONAL PASS: [list required fixes with timeline]

**Reviewer:** [name] | Date: [date] | Archived in: docs/qa/privacy-audit-[feature]-[date].md

---
## MyAdvocate Rules This Command Enforces
- Four-layer privacy architecture is non-negotiable — structural, not policy
- No AI call without PII scrubber confirmed
- No specific diagnoses stored
- Owner reporting reads aggregated metrics only, never user records
- Attorney referral requires formal privacy addendum
- Every audit result archived in docs/qa/
