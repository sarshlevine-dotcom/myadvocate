# Seven-Gate Chain Spec — generateLetter()

**Version:** 1.1
**Authority:** MA-AUT-006 §G6
**Status:** All 7 gates implemented. G5 (LQE) live. G4/G7 Phase 3 transition requires explicit unlock.
**Applies to:** All calls to `generateLetter()` in `src/lib/generate-letter.ts`
**Phase:** Gates 1–3 implemented Phase 2 Sprint 1. Gates 4–7 implemented Phase 2 Sprint 2.

---

## Overview

Every call to `generateLetter()` must pass through 7 sequential gates before an artifact is
created and delivered to the user. If any gate fails, execution halts at that gate — subsequent
gates never run. This ensures that PII never reaches the API, context never leaks across letter
types, all outputs are evaluated, and all artifacts are properly versioned and gated before
release.

Gates run in strict order. Each gate has a single responsibility. A gate MUST NOT perform the
work of another gate.

```
Input → G1 (Validation) → G2 (PII Scrub) → G3 (Context Firewall) →
         G4 (API Call) → G5 (LQE Hook) → G6 (Disclaimer Check) → G7 (Artifact State) → Output
```

---

## Gate Definitions

---

### Gate 1 — Input Validation

**What it does:** Verifies all required fields are present, non-empty, and correctly typed before
any processing begins.

**Implementation location:** Top of `generateLetter()` in `src/lib/generate-letter.ts`, before
any other logic.

**PASS criteria:**
- `caseId` is a non-empty string
- `userId` is a non-empty string
- `letterType` is one of: `denial_appeal`, `bill_dispute`, `hipaa_request`, `negotiation_script`
- `caseData` is a non-null object (may be empty `{}`)

**FAIL criteria:**
- Any required field is missing, `null`, `undefined`, or empty string
- `letterType` is any string not in the four known values

**On-FAIL action:**
- Throw `new Error('GATE_1_FAILED: <details>')` where details lists the failing condition
- Log `logEvent({ eventType: 'gate_failure', sourcePage: 'generateLetter', toolName: letterType })`
  non-blocking (`.catch(() => {})`)
- Never proceed to Gate 2

---

### Gate 2 — PII Scrub

**What it does:** Runs `scrubPII()` on `caseData` and confirms no exception was thrown before
the payload advances to Gate 3 or the API.

**Implementation location:** `generateLetter()` in `src/lib/generate-letter.ts`, immediately
after Gate 1. Wraps the existing `scrubPII()` call from `src/lib/pii-scrubber.ts`.

**PASS criteria:**
- `scrubPII(caseData)` completes without throwing
- Returns a `Record<string, unknown>` with PII field names removed

**FAIL criteria:**
- `scrubPII()` throws any error (e.g., unexpected input type, internal logic error)

**On-FAIL action:**
- Catch the exception from `scrubPII()`
- Log `logEvent({ eventType: 'gate_failure', sourcePage: 'generateLetter', toolName: letterType })`
  non-blocking
- Re-throw as `new Error('GATE_2_FAILED: PII_SCRUB_ERROR')`
- Never proceed to Gate 3

**Note:** `piiScrubberConfirmed: true` is passed to `trackedExecution()` in Gate 4 only after
Gate 2 has confirmed `scrubPII()` ran successfully. This is the two-layer confirmation: Gate 2
confirms scrubbing at the business logic layer; `trackedExecution()` enforces the same invariant
at the trace layer.

---

### Gate 3 — Context Firewall

**What it does:** Filters the scrubbed `caseData` to only the fields explicitly whitelisted for
the given `letterType` before the payload reaches the prompt. Non-whitelisted fields are silently
stripped and logged — they are never thrown to the caller.

**Implementation location:** `generateLetter()` in `src/lib/generate-letter.ts`, after Gate 2
produces the scrubbed payload. The filtered payload (`filteredData`) is passed to
`PROMPTS[letterType](filteredData)` — never the raw scrubbed payload.

**Context Allowlist:**

| letterType | Permitted caseData keys |
|---|---|
| `denial_appeal` | `denialCode`, `insurerType`, `state`, `denialDate`, `planType`, `serviceType`, `denialReason` |
| `bill_dispute` | `billAmount`, `serviceType`, `serviceDate`, `facilityType`, `state`, `disputeReason`, `chargesChallenged` |
| `hipaa_request` | `state`, `facilityType`, `recordsRequested`, `preferredFormat`, `deliveryMethod` |
| `negotiation_script` | `billAmount`, `serviceType`, `state`, `targetAmount`, `paymentCapacity` |

**PASS criteria:**
- All fields in the scrubbed payload are either in the allowlist (kept) or not in the allowlist
  (stripped)
- The filtered payload contains only whitelisted keys
- If no fields were stripped, gate passes silently

**FAIL criteria (non-halting):**
- One or more fields in the scrubbed payload are not in the allowlist for the given `letterType`
- This is a soft failure: Gate 3 strips the field and logs, but does NOT throw

**On-FAIL action (silent strip):**
- Remove blocked fields from the payload
- Log `logEvent({ eventType: 'gate_failure', sourcePage: 'generateLetter', toolName: letterType })`
  non-blocking
- Emit `console.warn('GATE_3_STRIPPED [letterType]: fieldA, fieldB')` for Phase 1 observability
  (will be replaced with n8n webhook in Phase 2)
- Pass the filtered payload to Gate 4 — execution continues

---

### Gate 4 — API Call

**What it does:** Makes the Anthropic API call via `trackedExecution()`, which wraps the call
in a Langfuse trace. Gate 4 passes only if the API call succeeds and returns a valid response.

**Implementation location:** `generateLetter()` in `src/lib/generate-letter.ts`, the existing
`trackedExecution()` block (Step 3 in current code). To be formalized as an explicit gate in
Sprint 2.

**PASS criteria:**
- `trackedExecution()` resolves without throwing
- `response.content[0].type === 'text'` and the text is non-empty

**FAIL criteria:**
- `trackedExecution()` throws (network error, rate limit, auth failure)
- Response content is missing or not of type `text`

**On-FAIL action:**
- Log error to Langfuse via `trackedExecution()` (already built into the trace layer — `errorState: true`)
- Re-throw as `new Error('GATE_4_FAILED: API_ERROR')`
- Do NOT create an artifact

**Phase 2 Sprint 2 work:** Add explicit try/catch around the `trackedExecution()` call with the
`GATE_4_FAILED` error code and non-blocking `logEvent` call.

---

### Gate 5 — LQE Hook

**What it does:** Runs the Letter Quality Evaluator (LQE) — three sequential checks: denial code
accuracy, YMYL safety, legal framing. **In Phase 1, this gate is a stub that always returns
PASS.** The real LQE is built in Sprint 2 (MA-AUT-006 §G1).

**Implementation location:** `generateLetter()` in `src/lib/generate-letter.ts`, after Gate 4
produces the raw letter text. Stub is a no-op returning `{ pass: true }` in Phase 1.

**PASS criteria (Phase 1 stub):**
- Always passes — stub returns `{ pass: true }` unconditionally

**PASS criteria (Sprint 2 — real LQE):**
- Denial code accuracy check: PASS
- YMYL safety check: PASS
- Legal framing check: PASS
- All three checks must pass; any failure is a gate failure

**FAIL criteria (Sprint 2 — real LQE):**
- Any one of the three LQE checks returns FAIL

**On-FAIL action (Sprint 2):**
- Do NOT append disclaimer or create artifact
- Route to Kate review queue via `addToReviewQueue()` with `failure_reason` set to the failing
  check name
- Log `logEvent({ eventType: 'gate_failure', sourcePage: 'generateLetter', toolName: letterType })`
  non-blocking
- Return a sentinel response to the caller indicating manual review is pending

---

### Gate 6 — Disclaimer Version Check

**Status: IMPLEMENTED** (Phase 2 Sprint 2)

**What it does:** Calls `getDisclaimerVersion()` immediately after Gate 5 (LQE) to capture and
validate the version string and short-hash for the disclaimer that was appended to the output.
Halts if the version is empty — ensuring every artifact records full provenance data.

**Implementation location:** `generateLetter()` in `src/lib/generate-letter.ts`, after the LQE
result is processed and before `validateArtifactState()` / `createArtifact()`.

**Constants in `src/lib/disclaimer.ts`:**
- `CURRENT_DISCLAIMER_VERSION` — semver string (e.g. `"1.0.0"`)
- `DISCLAIMER_HASH` — SHA-256 of `DISCLAIMERS[CURRENT_DISCLAIMER_VERSION]`, first 12 hex chars

**PASS criteria:**
- `getDisclaimerVersion()` returns `{ version, hash }` where `version` is non-empty
- `disclaimerVersion` and `disclaimerHash` are passed through to `createArtifact()`

**FAIL criteria:**
- `getDisclaimerVersion().version` is empty string, `null`, or `undefined`

**On-FAIL action:**
- Throw `new Error('GATE_6_FAILED: disclaimer version missing')`
- Log `logEvent({ eventType: 'gate_failure', ... })` non-blocking
- Do NOT call `validateArtifactState()` or `createArtifact()`

---

### Gate 7 — Artifact State

**Status: IMPLEMENTED** (Phase 2 Sprint 2)

**What it does:** Enforces the Phase 2 state machine invariant that all artifacts must be written
with `release_state = 'review_required'`. The `validateArtifactState()` guard runs before every
`createArtifact()` call — if future code accidentally sets a different state, the gate halts
before any DB write.

**State machine:**
```
pending → review_required → released (admin-only, Phase 3+)
          ↓
       archived
```
Phase 2 invariant: `generateLetter()` always writes `review_required`. `released` requires an
explicit Phase 3 gate unlock; it is never set here.

**Implementation location:**
- `validateArtifactState()` is defined in `src/lib/generate-letter.ts` (exported for unit testing;
  treat as `@internal` — do not call from application code)
- Called immediately before `createArtifact()` in `generateLetter()`
- `createArtifact()` is wrapped in try/catch with `GATE_7_FAILED` error code

**PASS criteria:**
- `releaseState === 'review_required'`
- `createArtifact()` resolves successfully and returns an artifact with an `id`
- `logEvent({ eventType: 'gate_7_passed', ... })` is emitted non-blocking

**FAIL criteria:**
- `releaseState` is any value other than `'review_required'` (throws from `validateArtifactState()`)
- `createArtifact()` throws (DB error, constraint violation)

**On-FAIL action:**
- Throw `new Error('GATE_7_FAILED: ARTIFACT_STATE_ERROR')`
- Log `logEvent({ eventType: 'gate_failure', ... })` non-blocking
- Do NOT add to review queue or return content to caller

---

### MA-SEC-002 P30 — Prompt Version Hash

**Status: IMPLEMENTED** (Phase 2 Sprint 2, same commit as Gates 6+7)

**What it does:** Computes a SHA-256 hash of the exact prompt sent to the Anthropic API, the
model string, and the current disclaimer version. Persisted on every artifact so the generation
inputs can be reconstructed at any future point.

**Algorithm:**
```
promptVersionHash = SHA-256(promptString + modelString + CURRENT_DISCLAIMER_VERSION)
```

**Computation location:** `generateLetter()` in `src/lib/generate-letter.ts`, after the prompt
string is built (extracted from `PROMPTS[letterType](filteredData)`) and before `trackedExecution`
fires. This ensures the hash captures the exact text sent to the API.

**Persistence:** `promptVersionHash` is passed to `createArtifact()` as an optional field.
Columns `disclaimer_hash` and `prompt_version_hash` are pending next migration batch — they are
included in the insert payload and will persist once the migration is applied.

---

## Gate Execution Summary

| Gate | Name | Halting? | Status | On-fail routing |
|---|---|---|---|---|
| 1 | Input Validation | Yes | ✅ Implemented Sprint 1 | Throw GATE_1_FAILED |
| 2 | PII Scrub | Yes | ✅ Implemented Sprint 1 | Throw GATE_2_FAILED |
| 3 | Context Firewall | No (strip only) | ✅ Implemented Sprint 1 | Strip + log GATE_3_STRIPPED |
| 4 | API Call | Yes | ✅ Implemented Sprint 2 | Throw GATE_4_FAILED |
| 5 | LQE Hook | Yes (when live) | ✅ Live Sprint 2 | Route to Kate queue + return sentinel |
| 6 | Disclaimer Version | Yes | ✅ Implemented Sprint 2 | Throw GATE_6_FAILED |
| 7 | Artifact State | Yes | ✅ Implemented Sprint 2 | Throw GATE_7_FAILED |

---

## Invariants

- Gate order is fixed. Gates may not be reordered.
- A gate failure MUST halt execution at that gate. Subsequent gates must not run.
- Gate 3 is the only non-halting gate. It strips and logs — never throws.
- All `logEvent()` calls in gate failure paths are non-blocking (`.catch(() => {})`). A logging
  failure must never block or mask a gate failure.
- Gate 5 stub (`{ pass: true }`) must be replaced with the real LQE before the false-positive
  rate calibration target (<10%) is met with Kate. See MA-AUT-006 §G1.
- `generateLetter()` must never be modified without consulting this spec first (CLAUDE.md
  Core Invariant: check MA-AUT-006 before any generateLetter() modification).

---

## Sprint Roadmap

| Sprint | Work |
|---|---|
| Sprint 1 | Gates 1, 2, 3 implemented; Gate 5 stub added |
| Sprint 2 ✅ | Gates 4, 6, 7 implemented; real LQE (G1) live; promptVersionHash (P30) + disclaimerHash (G6) persisted on every artifact |
| Sprint 3 | Gate 5 calibration with Kate — false-positive rate target <10%; Phase 3 gate unlock process for `released` state |
