---
name: legal-citation-engine
description: Retrieves relevant healthcare statutes and regulations. Use when generating appeal letters or regulatory complaints.
metadata:
  version: "1.0"
  category: workflow
  phase: 0
  domain: compliance
  ymyl: true
  model_tier: sonnet
  compliance_review_required: true
  depends_on: []
  triggers:
    - internal — called by other skills
    - "what law protects me"
    - "cite the regulation"
    - "legal basis for appeal"
---

## Purpose

Provide accurate legal citation references for healthcare regulatory arguments. Serves as the legal research layer for all document-generation skills.

## Instructions

### Step 1 — Identify jurisdiction
Determine:
- Federal vs. state law applicability
- Plan type (ERISA employer plan, ACA marketplace, Medicare, Medicaid, individual state-regulated)
- State of the user (for state-specific law)

### Step 2 — Retrieve statutes
Return relevant citations from the following sources:

**Federal Statutes & Regulations:**
- ACA (42 U.S.C. § 300gg et seq.) — coverage mandates, appeal rights, preventive care
- ERISA (29 U.S.C. § 1001 et seq.) — employer plan appeal requirements
- HIPAA (45 CFR Part 164) — privacy and records access rights
- No Surprises Act (42 U.S.C. § 300gg-111 et seq.) — surprise billing protections
- Mental Health Parity Act (29 U.S.C. § 1185a) — mental health coverage equity
- Medicare appeals: 42 CFR Part 405 (Medicare Part A/B), Part 422 (Part C/MA)
- Medicaid: 42 CFR Part 431 (state fair hearing rights)

**State Law:**
- State insurance code section for external independent review
- State balance billing protection statute
- State mandated benefit laws

### Step 3 — Return citation references
Format citations as:
- Full statute name
- Code citation (e.g., 42 U.S.C. § 300gg-111)
- Plain language summary of what it requires/protects
- How it applies to this user's specific situation

## Output Format

Returns a structured citation list for use by calling skills. Not typically shown directly to users — embedded in generated documents.

## Compliance Notes

- Acknowledge when state law is unclear or rapidly evolving
- Note when ERISA preemption limits state law application
- Do not provide legal interpretation — provide citation references only
