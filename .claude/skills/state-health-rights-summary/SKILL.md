---
name: state-health-rights-summary
description: Explains patient rights based on US state laws. Use when users ask about healthcare rights, insurance protections, or regulatory options.
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
    - Never interpret state law in a way that goes beyond the plain text of cited statutes
    - Never advise on ERISA preemption questions — flag these as requiring attorney review
  depends_on:
    - legal-citation-engine
    - legal-disclaimer-enforcer
  triggers:
    - "what are my rights"
    - "patient rights"
    - "insurance protections"
    - "state healthcare law"
    - "can my insurer do this"
    - "external appeal rights"
---

## Purpose

Provide a clear, state-specific summary of a patient's healthcare and insurance rights.

## Instructions

### Step 1 — Identify user state
Ask the user which state they are in if not already provided. Rights vary significantly by state.

### Step 2 — Retrieve state regulations
Via `legal-citation-engine`, identify relevant:
- State external appeal rights (all 50 states have some form)
- State-mandated benefits that insurers must cover
- Balance billing protections beyond federal No Surprises Act
- State insurance commissioner complaint process
- State Medicaid and marketplace protections

Also include universal federal rights:
- ACA preventive care mandates
- ERISA appeal rights (for employer-sponsored plans)
- Medicare rights (if applicable)
- Mental Health Parity and Addiction Equity Act

### Step 3 — Summarize patient rights
Produce a clear, plain-language summary organized by category:
- Appeal rights (internal, external, independent review)
- Coverage mandates (what must be covered)
- Billing protections (surprise billing, balance billing)
- Privacy rights (HIPAA)
- Complaint and enforcement channels

### Step 4 — Provide regulatory agency contact
List the correct contact for the user's situation:
- State Insurance Commissioner office
- State Health Department
- CMS (for federal plans)
- State Attorney General consumer protection

## Output Format

1. **Your State:** [state]
2. **Key Rights Summary:** [plain language, organized by category]
3. **Regulatory Contacts:** [agency name, phone, website]
4. **Relevant Statutes:** [citation list from legal-citation-engine]

## Compliance Notes

- Invoke `legal-disclaimer-enforcer` before final output
- Always note that employer self-funded plans (ERISA) are governed federally, not by state law
- Never provide legal advice — frame as informational guidance
