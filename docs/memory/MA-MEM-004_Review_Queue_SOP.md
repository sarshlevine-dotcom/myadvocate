# MA-MEM-004 — Memory Review Queue Operating Procedure
**Family:** Memory (MEM) | **Authority Level:** Operating Reference
**Status:** v1.0 | **Date:** 2026-03
**Authority:** MA-MEM-001 | **Owner:** Founder
**Review cadence:** Weekly (every Monday, bundled with Memory Curator digest)

---

## Overview

The Memory Review Queue is the human gate that sits between automated Memory Curator output and production memory retrieval. No memory reaches `approved` status without completing the relevant checklist below.

**Core principle:** Checklists are mandatory, not advisory. A checklist not completed = review not done.

**Review load management:** Operating XP (50 XP/week) is awarded for clearing the queue each week (no ELIGIBLE memory older than 7 days). The optimization-class auto-promotion path (Sprint 6) will reduce founder review load at scale.

---

## Checklist 1: Optimization-Class Memory Review (Founder Only)

**When to use:** Any memory with `memory_class = 'optimization'` AND `ymyl_sensitivity = 'low'`

**Required reviewer:** Founder
**Target turnaround:** Within 7 days of entering ELIGIBLE status

---

**OPTIMIZATION MEMORY REVIEW CHECKLIST**
Memory ID: _______________
Reviewed by: _______________
Date: _______________

**Step 1 — Verify classification**
- [ ] memory_class = 'optimization' (confirmed in DB)
- [ ] ymyl_sensitivity = 'low' (confirmed in DB)
- [ ] workflow_type is NOT report_abuse (excluded from Phase 2 memory)
- [ ] hospital_mode_template connection: confirm no Hospital Mode template references this cluster

**Step 2 — Content review**
- [ ] Content is 500 characters or fewer
- [ ] Content contains NO legal claims, statutory references, or rights language
- [ ] Content describes procedural/efficiency patterns only (routing, cost, sequencing)
- [ ] Content does not reference any specific user, case, or identifying information
- [ ] Content is written in plain language (no jargon requiring clinical interpretation)

**Step 3 — Quality signals**
- [ ] outcome_sample_size >= 10
- [ ] positive_outcome_rate >= 0.30 (optimization threshold per OQ-02)
- [ ] compliance_flags present in < 20% of source trajectories
- [ ] law_change_flagged = false

**Step 4 — Trigger conditions**
- [ ] trigger_conditions are specific enough to avoid over-broad injection
- [ ] workflow_type in trigger_conditions matches the memory's workflow_type
- [ ] All trigger_condition field values are valid taxonomy values (see MA-TRJ-001)
- [ ] Trigger conditions do not include any potentially PII-adjacent fields

**Step 5 — Provenance**
- [ ] source_trajectory_ids contains >= 10 UUIDs
- [ ] All source trajectory IDs exist in trajectory_events table (spot check 3)
- [ ] prompt_template_versions are valid and current

**Step 6 — Decision**
- [ ] APPROVE → Set memory_status = 'approved', compliance_review_status = 'approved', founder_reviewed_at = NOW()
- [ ] REJECT → Set memory_status = 'retired', retirement_reason = [specific reason], compliance_review_status = 'rejected'
- [ ] DEFER → Add note to Notion queue item; re-review next week

**Approval notes (required if approving):**
_______________________________________________

---

## Checklist 2: Strategy or Recovery-Class Memory Review (Founder + Kate)

**When to use:** Any memory with `memory_class IN ('strategy', 'recovery')` regardless of ymyl_sensitivity

**Required reviewers:** Founder AND Kate (both must sign)
**Target turnaround:** Within 7 days of entering ELIGIBLE status

---

**STRATEGY / RECOVERY MEMORY REVIEW CHECKLIST**
Memory ID: _______________
memory_class: _______________
ymyl_sensitivity: _______________
Founder reviewer: _______________
Kate reviewer: _______________
Founder review date: _______________
Kate review date: _______________

**Step 1 — Verify classification**
- [ ] memory_class is 'strategy' OR 'recovery' (confirmed)
- [ ] This is NOT an optimization-class memory routed here in error
- [ ] workflow_type is eligible for Phase 2 memory (not report_abuse, not hospital_mode)
- [ ] hospital_mode_template connection: confirm no Hospital Mode template references this cluster

**Step 2 — Content review (Founder)**
- [ ] Content is 500 characters or fewer
- [ ] Content contains NO legal claims, statutory references, or rights language
- [ ] Content does not describe what legal outcome is correct — only HOW to approach the workflow
- [ ] No insurer name, user name, case reference, or PII in content
- [ ] Language is plain and procedural

**Step 3 — Clinical / YMYL review (Kate)**
- [ ] Content does not contain clinical claims that require medical review
- [ ] Content does not contain statements about medical outcomes or prognosis
- [ ] If ymyl_sensitivity = 'medium': Kate confirms content is appropriate for medium-risk injection
- [ ] If ymyl_sensitivity = 'high': Kate explicitly confirms high-sensitivity approval (see Checklist 3)
- [ ] Kate's specific concern (if any): _______________________________________________

**Step 4 — Quality signals (both reviewers)**
- [ ] outcome_sample_size >= 10
- [ ] positive_outcome_rate >= 0.50 (strategy/recovery threshold per OQ-02)
- [ ] compliance_flags present in < 20% of source trajectories
- [ ] law_change_flagged = false
- [ ] retrieval_lift_score (if available): confirms directional improvement

**Step 5 — Trigger conditions (Founder)**
- [ ] Trigger conditions are specific (not overly broad)
- [ ] All values are valid taxonomy values per MA-TRJ-001
- [ ] Trigger conditions correctly describe the context where this strategy/recovery applies
- [ ] max_memories_injected cap on target template confirmed (default 2)

**Step 6 — Provenance (Founder)**
- [ ] source_trajectory_ids >= 10 entries
- [ ] prompt_template_versions are current
- [ ] legal_source_citations (if present) are for audit reference only — confirm NOT injected into prompts

**Step 7 — Dual sign-off**

Founder decision:
- [ ] APPROVE — pending Kate sign-off
- [ ] REJECT — document reason below

Kate decision:
- [ ] APPROVE — memory cleared for production
- [ ] REJECT — document reason below

**Both must approve. If either rejects, memory is rejected.**

Set on approval: memory_status = 'approved', compliance_review_status = 'approved',
kate_reviewed = true, kate_reviewed_at = NOW(), founder_reviewed_at = NOW()

Founder notes: _______________________________________________
Kate notes: _______________________________________________

---

## Checklist 3: High-Sensitivity or Legal-Adjacent Memory (Founder + Kate + Explicit Comment)

**When to use:** Any memory with `ymyl_sensitivity = 'high'` OR any memory that touches escalation paths, legal framing, or state-specific regulatory context

**Required reviewers:** Founder AND Kate
**Additional requirement:** Both reviewers must leave an explicit written approval comment (not just checkbox)
**Target turnaround:** Within 5 days (elevated priority)

---

**HIGH-SENSITIVITY MEMORY REVIEW CHECKLIST**
Memory ID: _______________
Trigger for high-sensitivity flag: _______________
Founder: _______________
Kate: _______________
Dates: _______________

**Step 1 — Sensitivity confirmation**
- [ ] ymyl_sensitivity = 'high' (confirmed)
- [ ] OR: memory touches escalation_required output_class workflow patterns
- [ ] OR: trigger_conditions include state_code (state-specific legal context)
- [ ] OR: content relates to regulatory contact patterns, appeal deadline patterns, or rights-adjacent routing

**Step 2 — Extra content scrutiny (Kate leads this section)**
- [ ] Kate has read the full content and source trajectory cluster analysis
- [ ] No content that could be interpreted as a legal right or entitlement
- [ ] No content that could be interpreted as clinical advice or medical guidance
- [ ] Content would not cause harm if retrieved in an edge case outside its trigger conditions
- [ ] Kate explicitly agrees this memory is safe for high-sensitivity context: YES / NO

**Step 3 — Injection scope validation**
- [ ] Identify which template(s) this memory would be injected into
- [ ] Confirm template ymyl_sensitivity = 'high' (required to receive high-sensitivity memory)
- [ ] Confirm max_memories_injected cap on that template
- [ ] Confirm memory content is safe even when combined with other injected memories (consider interaction effects)

**Step 4 — Expiry consideration**
- [ ] Does this memory reference state-specific law or regulation that may change?
  - If YES: set expires_at to an appropriate review date (e.g., 90 days, or next known legislative session)
  - If NO: expires_at can remain null

**Step 5 — Explicit approval comments (required — not optional)**

Founder explicit approval comment:
_______________________________________________
_______________________________________________

Kate explicit approval comment:
_______________________________________________
_______________________________________________

**Both explicit comments required before approval status is set.**

Set on approval: memory_status = 'approved', compliance_review_status = 'approved',
kate_reviewed = true, kate_reviewed_at = NOW(), founder_reviewed_at = NOW(),
expires_at = [if applicable]

---

## Checklist 4: Memory Retirement Review

**When to use:**
- law_change_flagged = true (automatic trigger from LegiScan)
- retrieval_lift_score drops below threshold (automated flag)
- Superseded by higher-confidence memory on same trigger_conditions
- Manual retirement request from Founder or Kate

**Required reviewer:** Founder (Kate for medium/high sensitivity memories)

---

**MEMORY RETIREMENT REVIEW CHECKLIST**
Memory ID: _______________
Retirement trigger: [ ] Law change  [ ] Low lift  [ ] Superseded  [ ] Manual
Reviewer: _______________
Date: _______________

**Step 1 — Confirm retirement trigger**
- [ ] If law_change_flagged = true: confirm which law changed and how it affects this memory's content
- [ ] If low lift: confirm retrieval_lift_score trend (not a single outlier event)
- [ ] If superseded: confirm the replacing memory ID and that it covers the same trigger conditions
- [ ] If manual: document the specific quality or compliance concern

**Step 2 — Impact assessment**
- [ ] How many active retrievals has this memory had? (retrieval_count)
- [ ] Are there other memories that cover this context? (check trigger_conditions overlap)
- [ ] Will retirement leave a gap that should be addressed with a new memory request?

**Step 3 — Execute retirement**
- [ ] Set memory_status = 'retired'
- [ ] Set retirement_reason = [specific, complete reason — this is permanent audit record]
- [ ] If law change: set law_change_flagged = true (if not already set)
- [ ] If superseded: add note linking to replacing memory ID

**Retirement reason (required — full sentence, not a code):**
_______________________________________________
_______________________________________________

---

## Checklist 5: Memory Curator System Prompt Review (Kate — One-Time)

**When to use:** Before the first automated Memory Curator generation run (MEM-S3-01). This is a one-time review, not a recurring checklist. Document outcome in Decision Log.

---

**MEMORY CURATOR SYSTEM PROMPT REVIEW CHECKLIST**
Reviewer: Kate
Date: _______________
Prompt version reviewed: _______________

**Step 1 — Hard constraint review**
- [ ] Prompt explicitly prohibits legal claims
- [ ] Prompt explicitly prohibits statutory references (statute, CFR, U.S.C., etc.)
- [ ] Prompt explicitly prohibits rights language ("you have the right", "legally entitled")
- [ ] Prompt explicitly prohibits referencing specific users, cases, or patients
- [ ] Prompt enforces the 500-character content limit
- [ ] Prompt directs Claude to skip clusters rather than force an output when pattern is unclear

**Step 2 — Example outputs review**
- [ ] The three example outputs in the prompt (§3 of MA-MEM-003) contain no legal claims
- [ ] The examples are procedural and appropriate for clinical/YMYL context
- [ ] Kate would be comfortable with these examples appearing in production memories

**Step 3 — Clinical risk review**
- [ ] Prompt does not enable generation of clinical claims
- [ ] Prompt does not enable generation of medical outcome predictions
- [ ] The "what to reject" criteria are appropriate and sufficient

**Step 4 — Recommendation**
- [ ] APPROVED — Curator system prompt cleared for automated use
- [ ] APPROVED WITH MODIFICATIONS — list required changes below
- [ ] REJECTED — list concerns below

Kate's notes:
_______________________________________________
_______________________________________________

Document outcome in Decision Log before activating the Memory Curator workflow.

---

## Operating Rules

**Review cadence:** Every Monday, review the queue as part of the weekly Memory Curator digest. Target: zero ELIGIBLE memories older than 7 days.

**Escalation:** If Kate is unavailable for more than 3 days and a medium/high sensitivity memory is waiting, Founder may defer (not approve) the memory and extend the review deadline by up to 7 days. Do not approve without Kate's sign-off.

**Audit trail:** Every completed checklist must result in a database update (memory_status, reviewer timestamps). Notion task must be marked complete. No verbal-only approvals.

**Emergency retirement:** If a memory is discovered to contain a legal claim or PII in production, Founder may immediately set memory_status = 'retired' without completing the full checklist. Document the emergency retirement in the Decision Log within 24 hours.

**Queue health metric:** ELIGIBLE queue count and oldest item age are reported every Monday in the founder digest (OQ-04 implementation). Operating XP of 50 XP/week for maintaining zero memories > 7 days old.
