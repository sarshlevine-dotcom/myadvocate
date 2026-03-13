# TIMS Decision Log
**Document family:** MA-DEC (Decision Log entries for TIMS)
**Authority:** MA-MEM-001 | **Owner:** Founder
**Date opened:** 2026-03

All binding decisions about the TIMS implementation are recorded here. Each entry is permanent — decisions may be superseded by new entries, not edited in place.

---

## DEC-TIMS-001: OQ-01 — Memory Curator System Prompt Review

**Question:** Should the Memory Curator system prompt be reviewed by Kate before the first automated generation run, or is founder review sufficient for the first batch?

**Decision:** Kate review required. Conservative default adopted.

**Rationale:** The Memory Curator system prompt is the primary content control mechanism for all automated memory generation. Since all STRATEGY and RECOVERY memories require Kate sign-off anyway, having Kate review the system prompt that generates them is consistent with that gate. This is a one-time review cost, not an ongoing burden. Given the YMYL context of MyAdvocate, the conservative path is correct.

**Implementation:** Use Checklist 5 in MA-MEM-004. Kate's review must be documented with a completed checklist before the Memory Curator workflow is activated (MEM-S3-01).

**Status:** RESOLVED — awaiting Kate's Sprint 3 review
**Decided by:** Founder | **Date:** 2026-03

---

## DEC-TIMS-002: OQ-02 — Positive Outcome Rate Thresholds

**Question:** What is the minimum acceptable positive_outcome_rate for a memory to be eligible for approval?

**Decision:** Accept proposed defaults.
- Optimization-class: positive_outcome_rate >= 0.30
- Strategy-class: positive_outcome_rate >= 0.50
- Recovery-class: positive_outcome_rate >= 0.50

**Rationale:** These thresholds are conservative enough to filter noise while not requiring perfect data. The 30% threshold for optimization reflects that efficiency gains (cost, speed) don't require majority outcome wins — consistent improvement in a subset is sufficient. The 50% threshold for strategy/recovery is more conservative because these memories carry higher stakes and require dual review regardless.

**Review trigger:** Reassess thresholds after 50 approved memories and at least one full Beehiiv outcome cycle (Sprint 6 review).

**Status:** RESOLVED
**Decided by:** Founder | **Date:** 2026-03

---

## DEC-TIMS-003: OQ-03 — Lift Measurement Methodology

**Question:** Should retrieval lift measurement be implemented as a hard A/B split (50% with memory, 50% without) or as a lookalike comparison using historical data?

**Decision:** Lookalike comparison using historical data.

**Rationale:** A true 50/50 A/B split would deliberately withhold potentially helpful memory injection from real users navigating healthcare/insurance disputes. This is a YMYL context — users are often in stressful, time-sensitive situations. Degrading their experience for measurement purposes is not acceptable. Lookalike comparison (comparing outcomes for executions with memory present vs. similar executions without memory, matched on workflow_type and time window) produces a valid signal without harming users.

**Implementation:** See migration 005 (memory_retrieval_log) for the lift measurement query. The `memory_was_injected` generated column is the group selector. The `user_action_post_retrieval` field is the dependent variable.

**Status:** RESOLVED
**Decided by:** Founder | **Date:** 2026-03

---

## DEC-TIMS-004: OQ-04 — Auto-Promotion Notification Frequency

**Question:** Should optimization-class memory auto-promotion require founder notification (but not approval), or silent auto-promotion after quality gate passes?

**Decision:** Founder notification required. Delivery: weekly Monday digest, bundled into existing Memory Curator report.

**Rationale:** "Silent" auto-promotion creates audit gaps that are problematic for a YMYL healthcare product. Weekly notification (not daily, not monthly) strikes the right balance: daily would generate noise on a system that may promote only a handful of memories per week; monthly is too long for a bad memory to run before review. The Monday digest bundles: (1) auto-promoted memories from past 7 days, (2) ELIGIBLE queue status, (3) 30-day lift metrics. One review touchpoint, not a separate notification channel.

**Implementation:** Node 13 of the Memory Curator n8n workflow (MA-MEM-003). Runs every Monday after the nightly analysis cycle.

**Activation:** Auto-promotion path is not enabled until Sprint 6 (MEM-S6-02). Notification infrastructure should be in place by Sprint 5.

**Status:** RESOLVED
**Decided by:** Founder | **Date:** 2026-03

---

## DEC-TIMS-005: OQ-05 — pgvector Upgrade Trigger

**Question:** At what approved memory count does the Phase 3 pgvector retrieval upgrade become a priority vs. other Phase 3 build items?

**Decision:** Accept proposed default: 50 approved memories triggers Phase 3 pgvector planning (not build — planning).

**Rationale:** Metadata match retrieval (Phase 2) is sufficient for a small, well-structured memory set. Hybrid retrieval (pgvector + metadata) adds meaningful value at scale when the memory space is large enough that semantic similarity becomes important for finding the right memory. 50 approved memories is the empirically reasonable threshold. Milestone 4 check (MEM-S6-05) confirms this trigger.

**Status:** RESOLVED
**Decided by:** Founder | **Date:** 2026-03

---

## DEC-TIMS-006: OQ-06 — Hospital Mode Phase 3+ Legal Review Scope

**Question:** Hospital Mode memory routing (not content injection) in Phase 3+: what specific legal review is required before even routing-level memory is considered?

**Decision:** Full legal review required. No provisional approval. Scope of legal review to be defined in Phase 3 planning, not now.

**Notation for Phase 3 planning:** The legal review for Hospital Mode Phase 3+ must address at minimum: (1) whether memory-assisted routing (not content injection) constitutes a legal opinion or medical advice, (2) applicable state and federal regulations for AI-assisted healthcare navigation in hospital contexts, (3) liability exposure for routing errors. Do not begin scoping this review before Sprint 6 is complete and the memory system has demonstrated stability.

**Current status:** Hospital Mode templates are permanently locked with `hospital_mode_template = true` from Sprint 1. No memory injection or routing assistance until Phase 3+ legal review is complete and explicitly signed off.

**Status:** NOTATED — deferred to Phase 3 planning
**Decided by:** Founder | **Date:** 2026-03

---

## DEC-TIMS-007: Checklist Formalization

**Decision:** All manual review processes in the TIMS memory lifecycle must have a formal written checklist completed before any approval decision is recorded. Checklists must be designed and distributed to reviewers (Founder, Kate) **before** the Review Queue goes live in Sprint 3 — not after.

**Rationale:** Ad-hoc review creates inconsistency and audit gaps. In a YMYL system where memory content has direct influence on health-related legal workflows, the review process must be as structured as the content it governs. The "agreed to add this" direction from the founder at the time of implementation planning is binding.

**Implementation:** All five checklists are defined in MA-MEM-004. Kate must be onboarded to these checklists (specifically Checklists 2, 3, and 5) before Sprint 3 begins. Founder must walk Kate through the checklists in a dedicated session — not via async document share alone.

**Specific onboarding requirement:** Before Sprint 3, Founder and Kate complete a dry-run review using a synthetic (fabricated) memory object and Checklist 2. This confirms mutual understanding of the process before real memories arrive in the queue.

**Status:** RESOLVED — binding from 2026-03
**Decided by:** Founder | **Date:** 2026-03

---

## DEC-TIMS-008: Beehiiv Outcome Pipeline Priority

**Decision:** The Beehiiv-to-OutcomeRecord pipeline (MEM-S5-06) is elevated in priority consideration. While Sprint assignment remains Sprint 5, the `outcome_records` table (migration 004) is created in Sprint 2. Any opportunity to pull forward even a stub Beehiiv pipeline (basic survey parsing → outcome_records write) should be evaluated in Sprint 3 planning.

**Rationale:** Outcome labels are the ground-truth quality signal for memory scoring. Without them, memory quality is assessed on proxy signals only (user_action rates). Every 30-day Beehiiv cycle that passes without the pipeline is a cycle of labeled data lost. The table exists from Sprint 2; the question is whether a basic pipeline can be wired earlier than Sprint 5's full implementation.

**Action:** At Sprint 3 planning, Founder evaluates feasibility of a basic Beehiiv webhook → outcome_records stub. If feasible within existing Sprint 3 scope, pull forward. If not, Sprint 5 remains the target.

**Status:** RESOLVED — to be re-evaluated at Sprint 3 planning
**Decided by:** Founder | **Date:** 2026-03

---

## Document Registry Entries to Create

Per MA-MEM-001 §11.2, the following document IDs must be formally registered in the Master Registry:

| Proposed ID | Document | Status |
|---|---|---|
| MA-MEM-001 | TIMS Architecture & Integration Supplemental | Exists (uploaded) |
| MA-MEM-002 | TIMS Database Schema (SQL migrations + TypeScript types) | Created 2026-03 |
| MA-MEM-003 | Memory Curator n8n Workflow Specification | Created 2026-03 |
| MA-MEM-004 | Memory Review Queue Operating Procedure | Created 2026-03 |
| MA-TRJ-001 | Trajectory Event Taxonomy | Created 2026-03 |

**Action required:** Founder registers all five document IDs in Master Registry before Sprint 1 begins.
