# MA-SEC-002 Additions — Priorities 25–30: Supplemental Audit Controls

> **Source:** myadvocate_supplemental_audit_report.docx — March 13, 2026
> Extends MA-SEC-002-additions-priorities-21-24.md.
> Insert immediately after Priority 24 in the Google Doc.
> Also update control count: 24 → 30 across all references.

---

## Priority 25: Server-Side Free-Tier Generation Limit

**Control Area**: Authorization / Rate Control

**Launch requirement**: Free-tier generation limits must be enforced server-side, not
at the UI layer. A free user must not be able to exceed 1 letter/month/tool via any
direct API call.

**Concrete implementation check**:

- `checkTierAuthorization(userId, letterType)` runs as the first step in every
  generation API route, before `generateLetter()` is invoked
- Check queries Supabase `subscriptions` table for current tier and `usage_count`
  for the current billing period
- Returns 403 with structured error if limit exceeded — never proceeds to generation
- Limit is account-level (tied to authenticated Supabase user), not IP-level
- Test: authenticated free user calling the API directly cannot exceed 1 letter/month

**Pass/Fail**: [ ]

**Block launch**: **Yes**

---

## Priority 26: Subscription Tier Authorization Server-Side

**Control Area**: Authorization / Role Scope (extends MA-SEC-002 P9)

**Launch requirement**: Subscription tier entitlements must be verified server-side
before any generation call proceeds. UI-layer gating is insufficient — a determined
user can bypass disabled buttons by calling API routes directly.

**Concrete implementation check**:

- Same `checkTierAuthorization()` function as P25 additionally verifies:
  (a) the requested letter type is permitted on the user's current tier
  (b) the user's subscription status is `active` (not `past_due`, `canceled`, etc.)
- Check reads live from Supabase `subscriptions` table (Stripe webhook keeps this current)
- Failure returns 403 with structured `{ error: "tier_insufficient", code: "AUTH_TIER" }`
- Result logged to `metric_events` for abuse monitoring

**Pass/Fail**: [ ]

**Block launch**: **Yes**

---

## Priority 27: YMYL Review Operating Model Documented and Agreed

**Control Area**: YMYL Governance / Operational

**Launch requirement**: The review operating model must be agreed with Kate and
documented before the first user artifact enters the queue.

**Operating model (defined 2026-03-13):**

| Parameter | Value |
|---|---|
| Primary reviewer | Kate (clinical) |
| Secondary / escalation | Sarsh (founder) |
| Delivery SLA | 24 hours from generation |
| Queue depth cap | 10 artifacts |
| On queue > 10 | Generation pauses; Sarsh alerted immediately |
| Kate unavailable | Escalate to Sarsh; extend SLA to 48hr; user notified |
| Phase 1 notification | Supabase webhook → email (Google Workspace) to Kate + Sarsh |
| Phase 2 notification | Replace email webhook with n8n workflow (when n8n is live) |
| LQE effect (post-G1) | LQE-passed letters bypass Kate queue; SLA applies to escalations only |

**Pass/Fail**: [ ]

**Block launch**: **Yes**

---

## Priority 28: Backup Restoration Tested in Staging Before Launch

**Control Area**: Resilience / Data Recovery

**Launch requirement**: A point-in-time Supabase restore must be completed in
the staging environment and results documented before launch is declared.

**Concrete implementation check**:

- Supabase PITR restore executed in staging
- Restore result documented: date tested, data coverage, any gaps noted
- File saved to `docs/security/backup-restoration-log.md`
- Recurring test scheduled quarterly (Notion recurring task set)

**Pass/Fail**: [ ]

**Block launch**: **No — Pre-Signal 1 (must complete before 10k visitors)**

---

## Priority 29: Minimum Incident Response Runbook Written

**Control Area**: Incident Management (MA-SEC-002 P19)

**Launch requirement**: A documented runbook must exist before user data is
in production. Does not need to be complex — must exist and be accessible.

**Runbook structure:**

| Severity | Definition | Response Target | Actions |
|---|---|---|---|
| **P1** | PII/health data exposed; letters bypassing review; Supabase breach | Same day | Disable endpoint → preserve logs → notify Anthropic/Supabase → contact affected users within 72hr |
| **P2** | Generation pipeline down; review queue inaccessible; Stripe webhook failing | 4 hours | Triage and restore → notify users if delay exceeds SLA |
| **P3** | Non-critical bug; performance degradation; cosmetic issues | 48 hours | Log → schedule fix → no user notification required |

- Runbook saved to `docs/security/incident-response-runbook.md`
- Includes: user notification template for P1 events, Supabase + Anthropic support contacts

**Pass/Fail**: [ ]

**Block launch**: **No — Pre-Signal 1 (must exist before user data in production)**

---

## Priority 30: Prompt Version Hash Captured at Generation Time

**Control Area**: AI Audit Trail / YMYL Accountability

**Launch requirement**: Every artifact record must contain the prompt version
and model version used to generate it, so any user-contested letter can be
fully reconstructed.

**Concrete implementation check**:

- `prompt_version_hash` column added to `artifacts` table (Supabase migration)
- Hash computed as `SHA-256(prompt_template_string + model_string + disclaimer_version)`
  at generation time in `generateLetter()`
- Hash stored with every artifact record — no artifact may be created without it
- On retrieval, hash allows exact reconstruction of generation conditions
- Test: pull any artifact and verify `prompt_version_hash` is non-null and matches
  current or historical prompt

**Pass/Fail**: [ ]

**Block launch**: **No — Pre-Signal 1**

---

## Document Upload Deferral Note (Issues 2 & 7)

**Decision recorded 2026-03-13:**

- Document upload is **deferred to Phase 2**. Phase 1 restricts all input to
  structured form fields only.
- Rationale: regex-based PII redaction is insufficient for insurance denial letters
  and EOBs (non-standard member IDs, OCR-variant addresses, diagnosis codes).
  NER-grade redaction (AWS Comprehend Medical or Azure Health NLP) required before
  document upload can be safely enabled.
- Malware scanning is a **hard dependency** for Phase 2 document upload. VirusTotal
  API (or equivalent) must run before any file touches Supabase Storage. Document
  upload does not ship without scanning in place.
- See sprint task: [Phase 2 doc upload] Implement malware scanning + NER PII redaction.

---

## Cross-Document Updates to Apply

1. Update control count from 24 → 30 across all MA-SEC-002 references
2. Add to HARD BLOCKERS: Priority 25, 26, 27
3. Add to PRE-SIGNAL 1 requirements: Priority 28, 29, 30
4. Add to Pre-Build Checklist:
   - Does it involve generation gating? (If yes → check P25, P26)
   - Does it touch the review queue? (If yes → check P27)

---

*Generated: 2026-03-13*
*Source: myadvocate_supplemental_audit_report.docx — Supplemental Security & Architecture Analysis*
*To be integrated into: MA-SEC-002_Security_Checklist_Phase10_Guide (Google Drive)*
