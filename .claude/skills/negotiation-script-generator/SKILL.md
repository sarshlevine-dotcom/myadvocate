---
name: negotiation-script-generator
description: Generates phone and in-person negotiation scripts for patients disputing medical bills or negotiating directly with billing departments, collection agencies, or insurers. Use when a user wants a script to call their hospital, negotiate a balance reduction, ask about charity care, or respond to a collections contact.
metadata:
  version: "1.0"
  category: billing
  phase: 1
  domain: billing
  ymyl: true
  model_tier: sonnet
  compliance_review_required: true
  depends_on:
    - pii-sanitizer
    - legal-disclaimer-enforcer
    - document-quality-checker
  triggers:
    - "what do I say when I call"
    - "how do I negotiate my bill"
    - "negotiate medical bill"
    - "call the hospital about my bill"
    - "collection agency calling me"
    - "can't afford my medical bill"
    - "negotiate payment plan"
    - "ask for charity care"
    - "financial hardship"
    - "settle my bill"
    - "negotiate balance"
    - "I want to call and dispute"
forbidden_outputs:
  - Never predict what the billing department will agree to
  - Never say "you will get this reduced" or imply a guaranteed outcome
  - Never advise the patient to lie or misrepresent their financial situation
  - Never suggest disputing a bill known to be legitimate
  - Never provide legal advice on debt collection law (reference FDCPA rights as general information only)
  - Never include the patient's actual financial figures in any text sent to the model — all numbers must be sanitized
---

## Purpose

Give patients a concrete, word-for-word phone script and supporting talking points for negotiating medical bills, requesting charity care, setting up payment plans, or responding to collections contacts. This is the verbal counterpart to `medical-bill-dispute-generator` — that skill writes the letter; this skill gives them what to say out loud.

## Instructions

### Step 1 — Invoke pii-sanitizer
Before sending any user input to the Anthropic API, invoke `pii-sanitizer`. Replace all names, account numbers, dates of birth, and financial specifics with placeholders.

### Step 2 — Identify negotiation scenario
Determine which of the four core scenarios applies:

| Scenario | Trigger signal | Key leverage |
|---|---|---|
| **A — Charity care / financial hardship** | "can't afford," "low income," "hardship" | Nonprofit hospitals are required to offer charity care; ACA § 501(r) for 501(c)(3) hospitals |
| **B — Bill reduction / error dispute** | "bill seems too high," "wrong charge," "want reduction" | Error rate in medical billing is ~80%; itemized bill request is a right |
| **C — Payment plan negotiation** | "need payment plan," "can't pay all at once" | Hospitals prefer payment plans over collections; no-interest plans are common |
| **D — Collections response** | "collections called me," "sent to collections" | FDCPA protections: right to validation letter within 30 days, right to dispute |

### Step 3 — Gather necessary context
Ask the user for (do not send to API until sanitized):
- Hospital / provider name (will become [PROVIDER])
- Approximate total amount owed (will become [BALANCE_AMOUNT])
- Whether the bill has gone to collections (yes/no)
- Whether they have insurance that should have covered this (yes/no)
- Their general hardship situation if Scenario A (categorized, not specific dollar figures)

### Step 4 — Generate the script
Produce a negotiation script with these sections:

**Opening statement** — who to ask for (billing department, patient financial services, or collections dept), how to introduce the call, reference number to have ready.

**Core ask** — the specific request stated directly and professionally. Scripts must be confident but not aggressive.

**Supporting talking points** — 3–5 factual points the patient can cite if pushed back on. Include relevant rights (e.g., right to itemized bill, right to charity care application, FDCPA validation right).

**Handling common objections** — scripted responses to the 3 most common pushbacks for the scenario.

**Closing / next steps** — what to get in writing, who to follow up with, escalation path if first call fails.

### Step 5 — Add scenario-specific rights callout
For each scenario, append a brief "Know your rights" block:
- **Scenario A:** 501(c)(3) hospitals must have a charity care policy (ACA § 501(r)). Ask for the application — they cannot deny you one.
- **Scenario B:** You have the right to an itemized bill. Billing errors are common. You can request a bill review from the hospital's patient advocate.
- **Scenario C:** Most hospitals have no-interest payment plans. Mention you'd like to avoid collections if possible — this is leverage.
- **Scenario D:** Under the FDCPA, you have 30 days to request debt validation in writing. Oral disputes do not trigger this right — follow up with a letter.

### Step 6 — Invoke legal-disclaimer-enforcer
Append the standard legal disclaimer. Flag that this script is for informational purposes only and the user should consult a patient advocate or consumer attorney for complex situations.

### Step 7 — Invoke document-quality-checker
Pass the completed script for final review. Verify:
- No forbidden outputs present
- No PII in the body
- Disclaimer appended
- Script is actionable and complete for the identified scenario

## Output Format

```
NEGOTIATION SCRIPT — [SCENARIO TYPE]
Provider: [PROVIDER]
Account Reference: [ACCOUNT_REF]
Prepared: [DATE]

─── BEFORE THE CALL ───────────────────────────────────
Have ready: [list of documents/numbers to have on hand]
Ask to speak with: [specific department/role]

─── OPENING ────────────────────────────────────────────
"[exact opening statement]"

─── YOUR CORE REQUEST ──────────────────────────────────
"[exact statement of the ask]"

─── SUPPORTING POINTS ──────────────────────────────────
• [point 1 with any relevant statute/right]
• [point 2]
• [point 3]

─── IF THEY SAY... ─────────────────────────────────────
Objection: "[common pushback 1]"
Your response: "[scripted reply]"

Objection: "[common pushback 2]"
Your response: "[scripted reply]"

─── CLOSING ────────────────────────────────────────────
"[closing statement + what to request in writing]"

─── NEXT STEPS ─────────────────────────────────────────
If no resolution: [escalation path]
Follow-up deadline: [timeframe]

─── KNOW YOUR RIGHTS ───────────────────────────────────
[Scenario-specific rights callout]

[LEGAL DISCLAIMER]
```

## Governance Notes

- This skill is YMYL — outputs directly affect patient financial decisions
- Invoke `pii-sanitizer` before every API call without exception
- Never imply guaranteed outcomes or specific reduction amounts
- The FDCPA information must be framed as general consumer rights information, not legal advice
- Cross-reference `medical-bill-dispute-generator` — if the patient needs a written version of their dispute, route them there after generating this script
