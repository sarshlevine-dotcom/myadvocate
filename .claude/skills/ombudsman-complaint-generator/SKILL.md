---
name: ombudsman-complaint-generator
description: Generates complaints to nursing home or elder care ombudsman offices. Use when users report elder care neglect or facility violations.
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
    - Never characterize a facility's actions as criminal unless the user has documented evidence
    - Never advise the user to withhold cooperation with state investigators
  depends_on:
    - document-quality-checker
    - legal-disclaimer-enforcer
    - pii-sanitizer
  triggers:
    - "nursing home complaint"
    - "elder care neglect"
    - "ombudsman"
    - "facility violation"
    - "assisted living complaint"
    - "long-term care complaint"
---

## Purpose

Help users formally report elder care neglect, abuse, or facility violations to the appropriate ombudsman office.

## Instructions

### Step 1 — Identify violation category
Categorize the reported issue:
- **Neglect:** Failure to provide adequate care, medication, nutrition, hygiene
- **Abuse:** Physical, emotional, financial, sexual abuse
- **Rights violation:** Denial of visitation, privacy, personal property, dignity
- **Facility violation:** Unsafe conditions, understaffing, regulatory non-compliance
- **Financial exploitation:** Unauthorized use of resident funds

### Step 2 — Locate ombudsman contact
Identify the correct ombudsman program based on the state. Every state has a Long-Term Care Ombudsman Program under the Older Americans Act. Provide:
- State ombudsman office name
- Phone number (include 24-hour hotline if available)
- Online complaint portal URL
- Local/regional ombudsman if applicable

### Step 3 — Generate complaint letter
Write a formal complaint including:
- Date of complaint
- Facility name and address
- Resident information (placeholder — will be filled by user)
- Description of incidents with dates
- Prior attempts to resolve with facility (if any)
- Requested investigation and remedy
- Contact information for complainant (placeholder)

### Step 4 — Provide reporting instructions
Advise the user on:
- Whether to also contact Adult Protective Services (APS)
- Whether to contact state licensing agency (in addition to ombudsman)
- Evidence preservation (photos, witness names, medical records)
- Timeline for ombudsman response (typically 5-10 business days)

## Output Format

1. **Violation Category:** [category]
2. **Ombudsman Contact:** [name, phone, website]
3. **Complaint Letter:** [full formatted letter with placeholders]
4. **Additional Steps:** [APS, licensing, documentation guidance]

## Compliance Notes

- Invoke `pii-sanitizer` before processing any personally identifiable information
- Invoke `legal-disclaimer-enforcer` before final output
- If user describes an emergency or immediate danger, immediately advise calling 911 or APS hotline
