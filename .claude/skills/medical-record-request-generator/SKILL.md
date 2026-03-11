---
name: medical-record-request-generator
description: Generates formal requests for medical records. Use when users need to request healthcare documentation from hospitals or providers.
metadata:
  version: "1.0"
  category: healthcare
  phase: 0
  domain: rights
  ymyl: true
  model_tier: sonnet
  compliance_review_required: true
  forbidden_outputs:
    - Never state "you should sue" or imply litigation is the right path
    - Never state "this was illegal" or make legal determinations
    - Never state "you have a case" or imply a patient has legal standing
    - Never state "you will win" or predict appeal/dispute outcomes
    - Never estimate settlement value or financial recovery amounts
    - Never predict attorney success likelihood
    - Never imply MyAdvocate is acting as a lawyer, doctor, or insurer
    - Never provide a medical diagnosis or contradict a treating physician
    - Never advise taking records from a facility without the proper legal request process
    - Never imply a provider's refusal to release records is definitely a HIPAA violation without review
  depends_on:
    - legal-disclaimer-enforcer
    - pii-sanitizer
  triggers:
    - "request medical records"
    - "get my records"
    - "HIPAA records request"
    - "medical records from hospital"
    - "medical records for appeal"
---

## Purpose

Generate a HIPAA-compliant formal request for medical records that a user can send to any US healthcare provider.

## Instructions

### Step 1 — Identify provider
Ask the user for the name of the provider or facility from which they need records. If the user needs records from multiple providers, offer to generate multiple letters.

### Step 2 — Generate request letter
Produce a formal HIPAA records request letter including:
- Date
- Provider/facility name and address (placeholder)
- Patient name and date of birth (placeholder — user fills in)
- Dates of service requested (specific or range)
- Type of records requested (complete medical record, specific visit notes, imaging, lab results, etc.)
- Format requested (paper, electronic, portal access)
- Delivery method (pickup, mail, fax, secure email)
- Statement invoking HIPAA right of access

### Step 3 — Include HIPAA language
Cite the HIPAA Right of Access (45 CFR § 164.524) explicitly in the letter. Include:
- The provider's obligation to respond within 30 days
- The provider's limitation on fees (cost of labor, supplies, postage only)
- The user's right to complain to the HHS Office for Civil Rights if denied

### Step 4 — Provide submission instructions
Tell the user:
- Where to submit (medical records department, not general reception)
- Bring photo ID if submitting in person
- Send certified mail if mailing
- Keep a copy of the request and track the 30-day deadline

## Output Format

1. **Records Request Letter:** [full formatted HIPAA-compliant letter with placeholders]
2. **What to Expect:** [timeline, fees, format options]
3. **If They Refuse:** [HHS complaint process and escalation]

## Compliance Notes

- Invoke `pii-sanitizer` — do NOT include real patient data in the template
- Invoke `legal-disclaimer-enforcer` before final output
- Note that psychotherapy notes have special protections and may require separate request
