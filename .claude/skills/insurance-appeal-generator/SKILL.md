---
name: insurance-appeal-generator
description: Generates structured insurance appeal letters. Use when a user requests help appealing an insurance denial or disputing a rejected claim.
metadata:
  version: "1.0"
  category: healthcare
  phase: 0
  domain: denial
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
    - Never guarantee the appeal will be approved or the denial overturned
    - Never include speculative clinical language not grounded in the patient's own documentation
  depends_on:
    - insurance-denial-decoder
    - legal-citation-engine
    - document-quality-checker
    - legal-disclaimer-enforcer
    - pii-sanitizer
  triggers:
    - "write appeal letter"
    - "appeal my denial"
    - "help me appeal"
    - "insurance appeal"
    - "dispute claim denial"
---

## Purpose

Produce a professionally formatted insurance appeal letter that maximizes the user's chance of overturning a denial.

## Instructions

### Step 1 — Extract denial details
Gather from the user:
- Insurer name
- Policy/Member ID (will be sanitized)
- Date of denial
- Denial code and reason
- Service/procedure denied
- Treating provider name
- Patient name (will be sanitized)

Invoke `pii-sanitizer` before sending any user data to the Anthropic API.

### Step 2 — Identify applicable regulations
Invoke `legal-citation-engine` to retrieve:
- Relevant state insurance statutes
- Federal protections (ACA, ERISA, Mental Health Parity Act if applicable)
- Insurer's own internal appeal deadline requirements

### Step 3 — Generate appeal argument
Based on denial type, construct the strongest argument:
- **Medical necessity denials:** Cite clinical guidelines (e.g., USPSTF, specialty society standards)
- **Coding/administrative denials:** Identify the specific error and cite correct coding
- **Coverage exclusion denials:** Identify ACA/state mandate exceptions
- **Experimental treatment denials:** Cite peer-reviewed evidence

### Step 4 — Apply formal letter structure
Format the letter with:
- Date and insurer address block
- RE: line with claim/denial reference number
- Opening statement of appeal intent
- Factual background section
- Argument section with regulatory citations
- Requested remedy (approve, reconsider, independent review)
- Closing with contact information placeholder

### Step 5 — Insert compliance disclaimer
Invoke `legal-disclaimer-enforcer` to append the required MyAdvocate legal disclaimer.

### Step 6 — Return formatted document
Invoke `document-quality-checker` to validate completeness before returning to user.

## Output Format

A complete, ready-to-send appeal letter in plain text, clearly marked with [PLACEHOLDER] fields the user must fill in before sending.

## Compliance Notes

- NEVER include raw PII in the letter template — use placeholders
- Always include the legal disclaimer
- Frame all medical claims as "as documented by your treating provider" not as medical advice
