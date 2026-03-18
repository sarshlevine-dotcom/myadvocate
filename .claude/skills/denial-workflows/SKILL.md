# Denial Workflows

This skill covers the appeal letter workflow, denial decoder, EOB parsing, escalation paths, and output rules.
Load this whenever working on generateAppealLetter(), explainDenialCode(), or the Denial Decoder feature.

## The Appeal Letter Workflow
1. User selects issue type (denial, bill dispute, rights question, complaint routing)
2. Structured form intake — no freeform narrative fields
3. PII scrubber strips name, DOB, address, insurance ID before payload reaches AI model
4. generateAppealLetter() receives structured, scrubbed payload
5. trackedExecution() wraps the call — logs to Langfuse (model, tokens, quality score, error state)
6. Output enters founder review queue (artifact queue — pending/approved/suppressed/edited states)
7. Approved output delivered to user

## Denial Code Database
- Target: 200+ codes in the Denial Decoder
- Each code has: code, payer context, plain-language explanation, recommended next action, upgrade path into appeal flow
- GEO-03 agent validates denial codes against known payer patterns before appeal generation
- Denial Intelligence Library (§6L in PMP): grows from outcome tracking data. Codes with <40% appeal success rate flagged for prompt review.

## EOB Parsing Assumptions
- Bounded document parsing only — EOB upload, basic extraction, unsupported file type handling
- Never promise complete parsing accuracy
- Output goes to founder review queue before being used in letter generation
- User owns their outputs (exported, deletable on demand)

## Output Rules for Appeal Letters
- Must include actionable next steps (specific, not generic)
- Must include disclaimer: "This is informational only and not legal or medical advice."
- Must never guarantee outcomes ("you will win this appeal")
- Must never name specific attorneys in the output
- Must never repeat back or store specific diagnosis information
- Format: formal letter addressed to insurer/provider, not a conversational response

## Output Rules for Denial Code Explanations (explainDenialCode)
- Plain language: 8th grade reading level or below
- Must explain: what the code means, why insurers use it, what the patient can do next
- Must include upgrade path to full appeal letter
- Must never state "this denial is illegal" or similar legal conclusions
- YMYL Tier 2 — nurse co-founder review required

## Escalation Paths
- Standard: generate letter → user sends to insurer/provider
- Escalated (Signal 1+): routeComplaint() → attorney referral (formal privacy addendum required before data transmission)
- State complaint: routeComplaint() → state insurance commissioner guidance
- Hospital billing dispute: generateDisputeLetter() (separate flow from insurance denial)

## Denial Intelligence Library Growth
- After 100+ responses: outcome tracking activates
- Win rate tracked per denial code per payer type
- Codes with <40% win rate flagged for prompt review and escalation path update
- This data drives the DIL (§6L) — the proprietary data moat
- Never publish individual case data — publish aggregate win rate statistics only (after 100+ responses, attorney-reviewed)

## Anti-Hallucination Protocol (MA-AHP-001)
- GEO-03 pre-check on all denial codes before letter generation
- No unverified regulatory claims in output
- AHP embedded in CNT-01 (YMYL Compliance Writer agent)
- DEV-03 activates on any modification to generateLetter() — AHP check embedded as activation dependency
