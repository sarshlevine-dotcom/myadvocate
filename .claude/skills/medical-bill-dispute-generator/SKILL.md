---
name: medical-bill-dispute-generator
description: Generates letters disputing incorrect or excessive medical bills. Use when users ask how to challenge a medical charge or dispute billing errors.
metadata:
  version: "1.0"
  category: healthcare
  phase: 0
  domain: billing
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
    - Never advise refusing to pay a bill that is not in dispute
    - Never suggest the hospital committed fraud without documented evidence of a billing error
  depends_on:
    - document-quality-checker
    - legal-disclaimer-enforcer
    - pii-sanitizer
  triggers:
    - "dispute medical bill"
    - "medical bill is wrong"
    - "overcharged by hospital"
    - "itemized bill review"
    - "surprise medical bill"
    - "No Surprises Act"
---

## Purpose

Help users challenge incorrect, excessive, or unexpected medical bills through a structured dispute letter.

## Instructions

### Step 1 — Analyze billing issue
Determine the nature of the dispute:
- **Billing error:** Duplicate charge, wrong code, service not received
- **Surprise bill:** Out-of-network charge without consent (No Surprises Act)
- **Excessive charge:** Charge significantly above fair market rate
- **Charity care eligibility:** User may qualify for financial assistance
- **Negotiation:** User wants to negotiate a lower amount

### Step 2 — Identify dispute basis
Select the strongest legal/regulatory ground:
- No Surprises Act (federal) for surprise billing
- State balance billing protections
- HIPAA right to itemized bill
- State consumer protection statutes
- Hospital financial assistance policies (501(c)(3) requirements)

### Step 3 — Generate dispute letter
Write a formal dispute letter including:
- Date and provider/billing department address
- Account/patient ID (placeholder)
- Specific charges being disputed with line item references
- Legal basis for dispute
- Requested remedy (correction, reduction, write-off, payment plan)
- Deadline for response (typically 30 days)

### Step 4 — Provide submission instructions
Tell the user:
- Where to send (certified mail recommended)
- What to keep (copies of everything)
- What escalation looks like if no response (state AG, CFPB, CMS)

## Output Format

1. **Dispute Type Identified:** [type]
2. **Legal Basis:** [statute/regulation]
3. **Dispute Letter:** [full formatted letter with placeholders]
4. **Submission Instructions:** [step-by-step]

## Compliance Notes

- Invoke `pii-sanitizer` on all user-submitted billing documents
- Invoke `legal-disclaimer-enforcer` before final output
- Never represent that a charge is definitely wrong — frame as "as I understand the bill"
