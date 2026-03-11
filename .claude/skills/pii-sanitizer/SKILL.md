---
name: pii-sanitizer
description: Detects and removes personal identifying information from user inputs. ALWAYS invoked before any Anthropic API call that includes user-submitted content.
metadata:
  version: "1.1"
  category: governance
  phase: 0
  domain: compliance
  ymyl: true
  model_tier: haiku
  compliance_review_required: false
  depends_on: []
  triggers:
    - internal — ALWAYS called before Anthropic API calls with user data
    - auto-triggered by document-upload-analysis
---

## Purpose

Enforce the four-layer privacy model and the NEVER-skip PII scrubbing rule from CLAUDE.md and SYSTEM.md. Strip all personally identifiable information before any user data reaches the Anthropic API.

## Critical Rule

This skill MUST be invoked before every Anthropic API call that includes user-submitted content. No exceptions. See `src/lib/pii-scrubber.ts` for the implementation.

---

## The Four-Layer Privacy Model

MyAdvocate's privacy architecture has four distinct layers. This skill operates at **Layer 2** but every skill must be aware of all four:

| Layer | Name | What it does | Where enforced |
|---|---|---|---|
| **1** | Structured inputs | User data enters only through typed, bounded form fields — never raw open-ended text for sensitive workflows | App layer: `src/app/` intake forms |
| **2** | PII scrubber (this skill) | Strips all identifiers from any free text before it leaves the app boundary | `src/lib/pii-scrubber.ts` |
| **3** | Context firewall (`contextFirewall`) | Whitelists which stored fields are allowed into each workflow type — prevents cross-context leakage where, e.g., a billing workflow could accidentally read case data from a denial workflow | `src/lib/` — to be implemented Phase 2 |
| **4** | Stateless model calls | Model calls must not retain or reference prior conversation state beyond the current turn — no persistent memory of user data between sessions | Enforced via `generateLetter()` abstraction |

**Layer 3 (`contextFirewall`) note:** Not yet implemented as of Phase 1. Until it is, skills must manually ensure they only pass fields relevant to their specific workflow to the API. Do not pass the full case object — pass only the minimum fields required.

---

## Instructions

### Step 1 — Enforce Layer 1 check
Verify that the input arrived through a structured workflow field, not a raw open-ended text input. If the source is a freeform field that wasn't gated by the intake schema, flag this as a privacy concern before proceeding.

### Step 2 — Scan and sanitize (Layer 2)
Identify and replace all PII with typed placeholders:

| PII Type | Replace with |
|---|---|
| Patient / provider / family names | `[NAME]` |
| Dates of birth | `[DATE_OF_BIRTH]` |
| Member / Policy IDs | `[MEMBER_ID]` |
| Social Security Numbers | `[SSN]` |
| Addresses | `[ADDRESS]` |
| Phone numbers | `[PHONE]` |
| Email addresses | `[EMAIL]` |
| Provider NPI numbers | `[NPI]` |
| Bank / account numbers | `[ACCOUNT_NUMBER]` |
| Claim numbers | `[CLAIM_NUMBER]` (preserve format for reference) |

### Step 3 — Generalize sensitive medical specifics
Replace precise medical details that could re-identify the patient:
- Specific ICD-10 diagnosis codes → keep the category ("mental health diagnosis", not the code)
- Drug names with dosages tied to a specific prescription → generalize to drug class
- Surgery dates → relative timing ("procedure occurred approximately 3 months ago")

### Step 4 — Apply stateless call rule (Layer 4)
Confirm that the sanitized payload being sent to the API contains only what is needed for this specific call. Do not forward session history, prior outputs, or unrelated case fields.

### Step 5 — Return sanitized payload
Return the cleaned text/object with placeholders. The calling skill uses this sanitized version for all API calls.

---

## Enforcement Notes

- Implementation lives in `src/lib/pii-scrubber.ts` — this skill describes the workflow intent
- Any code change to `pii-scrubber.ts` requires a new migration and security review per MA-SEC-002
- **Layer 3 (contextFirewall)** is tracked in the Parking Lot for Phase 2 implementation
- Failure to invoke this skill before API calls is a critical security violation per MA-SEC-002
- The `generateLetter()` function in `src/lib/generate-letter.ts` is the single routing boundary — all model calls must go through it; never call the Anthropic SDK directly from page or component code
