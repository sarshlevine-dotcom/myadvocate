---
name: appeal-strategy-generator
description: Generates structured strategies for appealing insurance denials. Use when users want guidance before writing an appeal.
metadata:
  version: "1.0"
  category: workflow
  phase: 0
  domain: denial
  ymyl: true
  model_tier: sonnet
  compliance_review_required: false
  depends_on:
    - insurance-denial-decoder
    - legal-citation-engine
  triggers:
    - "appeal strategy"
    - "how should I appeal"
    - "best way to appeal"
    - "appeal options"
    - "should I appeal this"
---

## Purpose

Analyze the denial situation and produce a ranked strategic plan for appeal before generating the actual letter.

## Instructions

### Step 1 — Identify denial reason
If not already done, invoke `insurance-denial-decoder` to classify the denial type. Key categories:
- Medical necessity denial
- Administrative/coding error denial
- Coverage exclusion denial
- Prior authorization failure
- Out-of-network denial
- Experimental/investigational denial

### Step 2 — Analyze insurer guidelines
Based on the insurer and plan type (employer, marketplace, Medicare, Medicaid), identify:
- Internal appeal deadline (typically 180 days for employer plans, 60 days for marketplace)
- Number of internal appeal levels allowed
- Whether expedited/urgent appeal applies
- External Independent Medical Review eligibility

### Step 3 — Recommend appeal approach
Produce a ranked strategy with reasoning:

**Option A — Internal Appeal:** Best first step in most cases. Cite specific medical necessity criteria and clinical evidence.

**Option B — Peer-to-Peer Review:** Physician calls insurer's medical director directly. Most effective for medical necessity denials. Must be done before or during internal appeal.

**Option C — External Independent Review:** After internal appeals exhausted. Independent organization reviews — insurer must comply with result under ACA.

**Option D — State Complaint:** File with state insurance commissioner. Works for fully-insured plans. Creates regulatory pressure.

**Option E — Concurrent Strategies:** Filing internal appeal and state complaint simultaneously is allowed and often effective.

## Output Format

1. **Denial Classification:** [type and strength of case]
2. **Recommended Strategy:** [ranked options A-E with reasoning]
3. **Critical Deadlines:** [appeal deadlines with dates if known]
4. **Evidence Needed:** [what to gather before writing the appeal]
5. **Ready to write the letter?** [prompt to invoke insurance-appeal-generator]

## Compliance Notes

- Always highlight appeal deadlines — missing them forfeits appeal rights
- Note that ERISA plans have different (and often weaker) external review rights
- Invoke `legal-disclaimer-enforcer` before final output
