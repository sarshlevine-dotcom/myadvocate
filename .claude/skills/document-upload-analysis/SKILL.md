---
name: document-upload-analysis
description: Analyzes uploaded healthcare documents and identifies actionable issues. Use when users upload denial letters or medical bills.
metadata:
  version: "1.0"
  category: workflow
  phase: 0
  domain: denial
  ymyl: true
  model_tier: sonnet
  compliance_review_required: false
  depends_on:
    - pii-sanitizer
    - insurance-denial-decoder
    - appeal-strategy-generator
  triggers:
    - document upload event
    - "analyze this letter"
    - "what does this say"
    - "I uploaded my EOB"
    - "here is my denial letter"
    - "look at this bill"
---

## Purpose

Serve as the entry point for document-based user workflows. Extract, classify, and route healthcare documents to the appropriate downstream skills.

## Instructions

### Step 1 — Extract text from document
Process the uploaded document (PDF, image, or text). Extract all text content. Handle common document quality issues (scanned documents, low resolution) gracefully.

### Step 2 — Identify document type
Classify the document as one of:
- **Explanation of Benefits (EOB)** — from insurer, post-claim
- **Denial Letter** — formal denial from insurer
- **Medical Bill / Itemized Statement** — from provider
- **Insurance Card** — benefits summary
- **Prior Authorization Decision** — approval or denial of future care
- **Medical Records** — clinical documentation
- **Other** — ask user to describe

### Step 3 — Detect denial or billing issues
Based on document type:
- For EOBs/Denial Letters: Extract denial codes, denial reason, claim amount, appeal deadline
- For Medical Bills: Identify duplicate charges, unbundling, upcoding indicators, surprise bill elements
- For Prior Auth Denials: Identify denied service, medical necessity criteria cited

### Step 4 — Invoke `pii-sanitizer`
Before any further processing, strip all personally identifiable information (name, DOB, member ID, address, provider NPI) from the extracted text.

### Step 5 — Recommend next actions
Based on document classification and issues detected, route to the appropriate skill:
- Denial code found → `insurance-denial-decoder`
- Appeal opportunity identified → `appeal-strategy-generator`
- Billing error found → `medical-bill-dispute-generator`
- Rights question → `state-health-rights-summary`

## Output Format

1. **Document Type:** [classification]
2. **Key Issues Found:** [bullet list of actionable items]
3. **Appeal Deadline:** [if applicable — CRITICAL field]
4. **Recommended Next Steps:** [skill routing with explanation]

## Compliance Notes

- ALWAYS invoke `pii-sanitizer` BEFORE sending extracted text to any Anthropic API call
- NEVER store raw document text — only the sanitized version
- Flag appeal deadlines prominently — missing them is the #1 reason appeals fail
