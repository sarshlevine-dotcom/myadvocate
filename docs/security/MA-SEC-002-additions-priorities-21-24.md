# MA-SEC-002 Additions — Priorities 21–24: AI Content Security

> **Instructions for use:** Insert the section below directly into the Google Doc
> `MA-SEC-002_Security_Checklist_Phase10_Guide`, immediately after **Priority 20**
> and before the `## MA-SEC-002-B: Object Controls` heading.
>
> Also apply the three **cross-document updates** listed at the bottom of this file.

---

## AI Content Security Controls (Priorities 21–24)

These four controls address prompt injection and AI-specific attack surfaces that are
distinct from general data security. They were added post-Phase 1 ship based on a
targeted security assessment of the AI intake pipeline.

---

### **Priority 21: Intake Content Sanitization Gate**

**Control Area**: AI Content Security

**Launch requirement**: All user-supplied text fields must be sanitized before prompt
interpolation.

**Concrete implementation check**:

- Known injection markers (e.g., "Ignore previous instructions", "You are now...",
  role-reassignment phrasing) are stripped or flagged before prompt construction
- Flagged inputs are logged with session metadata
- System falls back to a safe value or rejects the field on flag; does not silently
  pass suspicious content through
- Re-verify this control whenever a new text input field is added to the intake flow

**Pass/Fail**: [ ]

**Primary objects affected**: Case, Document

**Notes**: Covers direct prompt injection via intake fields. This is a new attack surface
relative to the original 20 controls and must be treated as a hard launch blocker.

**Block launch**: **Yes**

---

### **Priority 22: External Content Isolation Before AI Exposure**

**Control Area**: AI Content Security

**Launch requirement**: No raw external content (uploaded documents, scraped data,
webhook payloads) should flow directly into AI prompts.

**Concrete implementation check**:

- Document parsing layer extracts typed, structured fields only; raw document text is
  never passed directly to `generateLetter()`
- `generateLetter()` abstraction enforces this at the signature level: it does not
  accept raw document text as a parameter
- n8n automation agents must extract structured content before any AI exposure step;
  no raw-content-to-prompt pipeline is permitted
- Source provenance is logged (what content type entered the pipeline)

**Pass/Fail**: [ ]

**Primary objects affected**: Document, Extraction Output, Artifact

**Notes**: Covers indirect prompt injection via uploaded documents or external data.
Document upload is a Phase 2 feature, so this control is not a Phase 1 hard blocker —
but it MUST pass before the Phase 2 document upload feature ships.

**Block launch**: **No for Phase 1 — Yes before Phase 2 document upload**

---

### **Priority 23: Quarantine and Escalation Path**

**Control Area**: AI Content Security

**Launch requirement**: Detected injection attempts must trigger a defined response path,
not silent failure or unlogged rejection.

**Concrete implementation check**:

- Three-step response on flag: (1) reject input with a generic error message to the user,
  (2) log to AuditLog with full session context, (3) increment per-session injection
  flag counter
- Three or more flags within a single session triggers rate-limit escalation and a
  founder alert
- Flagged inputs are **never** auto-retried or silently forwarded to a fallback model
- Rejection message must not confirm the reason ("injection detected" language tells
  an attacker they are close)

**Pass/Fail**: [ ]

**Primary objects affected**: Case, Metric Event, AuditLog

**Notes**: The logging requirement is load-bearing — without it, injection attempts are
invisible. Treat as a hard launch blocker.

**Block launch**: **Yes** (logging requirement is prerequisite)

---

### **Priority 24: System Prompt Integrity and Confidentiality**

**Control Area**: AI Content Security

**Launch requirement**: System prompts must be server-side only and must not be
reproducible via adversarial user input.

**Concrete implementation check**:

- System prompts are never included in client-side code, API responses, or error
  messages
- Pre-launch: at least one adversarial test session confirms prompts cannot be extracted
  via crafted inputs
- If a verbatim phrase from a system prompt appears in a user-facing output during
  testing, restructure the prompt immediately before launch
- All system prompts are version-controlled server-side only

**Pass/Fail**: [ ]

**Primary objects affected**: All AI-powered workflows (generate-letter.ts and any
future skill-level prompts)

**Notes**: Confidential system prompts are part of the product's IP. Exposure also
provides a roadmap for injection attacks. Hard launch blocker.

**Block launch**: **Yes**

---

## Business Logic Security Note: Attorney Referral Routing

There is a fifth AI-adjacent attack surface that does not fit neatly into the four
controls above: **business logic manipulation via narrative routing**.

If the system ever uses narrative or free-text content (e.g., patient-described
symptoms, denial reason text, uploaded letter content) to drive routing decisions —
such as whether to escalate a case to attorney referral — that routing logic is
vulnerable to manipulation. An adversarial user could craft input designed to trigger
high-value escalation paths.

**Mitigation rule**: Routing decisions must be based on structured fields only
(e.g., denial code, issue type, state, subscription tier), not on evaluated free-text
content.

**Action**: When the attorney referral routing workflow is designed, add an explicit
architectural check: the routing condition must not evaluate narrative content.
Document this constraint in the skill definition for any routing agent.

**This is not a launch blocker** for Phase 1 (the routing feature is not yet built),
but it must be enforced as a design constraint before the feature is implemented.

---

## Cross-Document Updates to Apply in the Google Doc

Make the following three additional edits to keep the document internally consistent:

**1. Purpose section** — change:
> "This bundle contains the **20** security and privacy controls..."

to:
> "This bundle contains the **24** security and privacy controls..."

**2. MA-SEC-002-A section** — change:
> "**Rows**: **20** controls"

to:
> "**Rows**: **24** controls"

**3. Launch Gate Logic — add to HARD BLOCKERS list:**
> - Priority 21: Intake Content Sanitization
> - Priority 23: Quarantine and Escalation Path
> - Priority 24: System Prompt Integrity

**Add to STRONG RECOMMENDATIONS list:**
> - Priority 22: External Content Isolation (required before Phase 2 document upload)

**4. Pre-Launch Checklist** — change:
> "All **20** controls show PASS in Security Checklist"

to:
> "All **24** controls show PASS in Security Checklist"

**5. Pre-Build Checklist — add two new items:**
> - Does it accept user text input? (If yes → check Priorities 21, 23, 24)
> - Does it process external documents or data? (If yes → check Priority 22)

---

*Generated: 2026-03-12*
*Source: Security assessment session covering prompt injection attack surfaces*
*To be integrated into: MA-SEC-002_Security_Checklist_Phase10_Guide (Google Drive)*
