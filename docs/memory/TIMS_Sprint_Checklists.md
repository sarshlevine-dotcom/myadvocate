# TIMS Sprint Checklists — Phase 2
**Authority:** MA-MEM-001 §9 | **Owner:** Founder
**Status:** v1.0 | **Date:** 2026-03

Each sprint checklist is the Definition of Done for that sprint's TIMS tasks. A sprint's TIMS work is not complete until every item is checked. Items marked 🔒 are security/compliance gates — these cannot be skipped or deferred.

---

## Pre-Sprint: Before Any Code Begins

- [ ] MA-TRJ-001 taxonomy locked and filed in Master Registry (no code until this is done)
- [ ] All five TIMS document IDs registered in Master Registry (MA-MEM-001 through MA-MEM-004, MA-TRJ-001)
- [ ] OQ-01 through OQ-06 all resolved (Decision Log entries DEC-TIMS-001 through DEC-TIMS-008 complete)
- [ ] Kate briefed on her review role and the Review Queue process
- [ ] Sprint 1 cost/duration bucket calibration thresholds drafted (from baseline generateLetter() data if available, or using placeholder ranges to be updated post-launch)
- [ ] Founder has confirmed: cost/duration bucket thresholds for `api_cost_bucket` and `execution_duration_ms_bucket` (low/medium/high boundary values documented in MA-MEM-002)

---

## Sprint 1 Checklist — Schema & Foundation

**Parallel to:** Phase 2 core tool infrastructure build
**XP target:** 150 Build XP (MEM-S1-01 through MEM-S1-08)

### MEM-S1-01: trajectory_events migration
- [ ] Migration file created (migration 001 SQL)
- [ ] All enum types created (tims_workflow_type, tims_output_class, tims_user_action, tims_tier, tims_cost_bucket, tims_duration_bucket, tims_letter_length_bucket)
- [ ] Table created with all fields matching MA-MEM-001 §3.1 and MA-TRJ-001
- [ ] Both constraints applied (denial_code_family scope, state_code format)
- [ ] All 6 indexes created
- [ ] RLS enabled, service_role policy applied
- [ ] All column comments applied
- [ ] Migration runs clean in staging: `supabase db push` passes without errors
- [ ] TypeScript types generated / updated in tims.types.ts

### MEM-S1-02: memory_objects migration
- [ ] Migration file created (migration 002 SQL)
- [ ] All enum types created (tims_memory_class, tims_memory_status, tims_ymyl_sensitivity, tims_compliance_review_status)
- [ ] Table created with all fields matching MA-MEM-001 §3.2
- [ ] Content max 500 char constraint enforced
- [ ] All 5 business logic constraints applied (kate_review, approved_requires_compliance, retirement_reason, law_change_on_approval, no_approval_on_law_change)
- [ ] updated_at trigger created and functional
- [ ] All 6 indexes created (especially idx_mo_retrieval_eligible — critical path)
- [ ] RLS enabled, service_role policy applied
- [ ] Migration runs clean in staging

### MEM-S1-03: outcome_records migration (table only — pipeline in Sprint 5)
- [ ] Migration file created (migration 004 SQL)
- [ ] All enum types created (tims_outcome_type, tims_outcome_source, tims_outcome_confidence)
- [ ] Table created with trajectory_event_id FK
- [ ] Both business logic constraints applied (low-confidence not eligible, pending not eligible)
- [ ] Unique index on trajectory_event_id (one outcome per trajectory)
- [ ] FK from trajectory_events.outcome_id to outcome_records.id added
- [ ] RLS enabled
- [ ] Migration runs clean in staging

### MEM-S1-04: PromptTemplateMemoryConfig extension
- [ ] Migration file created (migration 003 SQL)
- [ ] All 7 columns added to prompt_templates (memory_enabled DEFAULT FALSE, allowed_memory_classes DEFAULT '{}', max_memories_injected DEFAULT 2, ymyl_sensitivity DEFAULT 'high', memory_retrieval_strategy DEFAULT 'metadata_match', require_approved_status DEFAULT TRUE, hospital_mode_template DEFAULT FALSE)
- [ ] Hospital Mode firewall constraint applied (chk_hospital_mode_memory_firewall)
- [ ] allowed_memory_classes validation constraint applied
- [ ] Phase 3 hybrid retrieval block constraint applied
- [ ] Indexes created
- [ ] 🔒 **CRITICAL:** All existing Hospital Mode templates identified and updated: `hospital_mode_template = TRUE` (UPDATE statement run and confirmed, count documented below)
  - Count of Hospital Mode templates flagged: ___
  - SQL run by: ___ | Date: ___
- [ ] Confirm: all new templates default to memory_enabled = FALSE
- [ ] Migration runs clean in staging

### MEM-S1-05: memory_retrieval_log migration
- [ ] Migration file created (migration 005 SQL)
- [ ] Table created with all fields
- [ ] Generated column `memory_was_injected` works correctly
- [ ] All 4 indexes created (including idx_mrl_lift_measurement — critical for MEM-S4-03)
- [ ] RLS enabled
- [ ] Migration runs clean in staging

### MEM-S1-06: TypeScript types
- [ ] tims.types.ts complete with all types matching schema
- [ ] All enum values match MA-TRJ-001 exactly
- [ ] MemoryTriggerConditions interface defined
- [ ] TimsExecutionWrapper interface defined (pre/post wrapper for generateLetter())
- [ ] MemoryCuratorOutput union type defined
- [ ] File imports clean (no TypeScript errors)

### MEM-S1-07: 🔒 Security Audit Gate
**This gate must pass before any trajectory data is collected.**
- [ ] 🔒 All 5 tables have RLS enabled (verified with: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%tims%' OR tablename IN ('trajectory_events', 'memory_objects', 'memory_retrieval_log', 'outcome_records')`)
- [ ] 🔒 No user_id column or FK to auth.users in trajectory_events (confirm with `\d trajectory_events`)
- [ ] 🔒 session_id is NOT a FK to any user table (confirm with `\d trajectory_events`)
- [ ] 🔒 All column comments confirming privacy constraints are in place
- [ ] 🔒 Hospital Mode templates flagged: count verified, list reviewed by Founder
- [ ] 🔒 Kate has reviewed the hospital_mode_template constraint and confirms it meets her clinical review standard
- [ ] Security audit completed by: ___ | Date: ___
- [ ] Kate sign-off on security audit: ___ | Date: ___

### MEM-S1-08: Taxonomy calibration
- [ ] api_cost_bucket thresholds documented: low = <$___, medium = $___ to $___, high = >$___
- [ ] execution_duration_ms_bucket thresholds documented: fast = <___ms, medium = ___–___ms, slow = >___ms
- [ ] Thresholds added to MA-MEM-002 calibration notes
- [ ] Method for applying these buckets at runtime implemented in generateLetter() wrapper

---

## Sprint 2 Checklist — generateLetter() Instrumentation

**XP target:** 300 Build XP (MEM-S2-01 through MEM-S2-04)

### MEM-S2-01: generateLetter() trajectory emission
- [ ] Pre-execution hook implemented: check `prompt_template.memory_enabled`
- [ ] 🔒 Hospital Mode firewall check implemented in code (not just DB constraint): if `hospital_mode_template = true`, skip retrieval and set `memory_ids_injected = []`
- [ ] Retrieval query runs against memory_objects using trigger_conditions @> match
- [ ] Retrieved memories injected into prompt context up to `max_memories_injected` cap
- [ ] Cap is enforced in code (not just relied on config)
- [ ] Post-execution hook implemented: TrajectoryEventInsert emitted
- [ ] All TrajectoryEvent fields populated correctly
- [ ] PII scrubber runs BEFORE trajectory event write (confirm with privacy gate audit)
- [ ] session_id is ephemeral (not joined to user_id anywhere in the write path)
- [ ] TrajectoryEvent written to trajectory_events table
- [ ] MemoryRetrievalLog entry written after each execution

### MEM-S2-02: PromptTemplateMemoryConfig schema extension live
- [ ] All Prompt Template Registry entries confirmed to have memory_enabled = FALSE by default
- [ ] memory_retrieval_strategy = 'metadata_match' on all templates (no hybrid before Phase 3)
- [ ] require_approved_status = TRUE on all templates
- [ ] Max_memories_injected = 2 on all templates (can be adjusted per template, not globally)

### MEM-S2-03: Privacy verification
- [ ] Kate reviews: sample of 10 trajectory events from staging to confirm no PII in any field
- [ ] Kate confirms: session_id is not linkable to any user
- [ ] Kate confirms: denial_code_family, insurer_category, procedure_category are all bucketed (no raw user input)
- [ ] Kate sign-off: ___| Date: ___

### MEM-S2-04: Data collection confirmed
- [ ] First trajectory event successfully written to trajectory_events table
- [ ] Event fields validated against tims.types.ts
- [ ] MemoryRetrievalLog entry created for the execution (even if no memories injected)
- [ ] Signal XP: 100 XP awarded at 100 trajectory events milestone (set up milestone tracker)

---

## Sprint 3 Checklist — Memory Curator + Review Queue

**Trigger:** 100 trajectory events collected OR 30 days post-Sprint 2
**XP target:** 400 Build XP + 100 Operating XP

### MEM-S3-01: Memory Curator n8n workflow live
- [ ] 🔒 Kate has completed Checklist 5 (Memory Curator System Prompt Review) in MA-MEM-004
- [ ] 🔒 Kate's approval documented in Decision Log (DEC-TIMS-001 implementation step)
- [ ] All 13 n8n workflow nodes implemented per MA-MEM-003
- [ ] Workflow tested with synthetic trajectory data (minimum 10 fabricated events per test cluster)
- [ ] Quality gate tested: verify clusters below thresholds are correctly rejected
- [ ] Legal keyword detection tested: verify memories with legal claims are rejected in Node 8
- [ ] Error handling tested: Supabase failure, Claude API failure, JSON parse error
- [ ] Nightly schedule set: 2:00 AM local server time, 7 days/week
- [ ] Manual trigger tested successfully
- [ ] First real run: Founder reviews all output with Kate before any memory reaches ELIGIBLE status

### MEM-S3-02: Review Queue operational
- [ ] Notion Review Queue integration live (or equivalent)
- [ ] Automatic task creation on ELIGIBLE memory confirmed (Node 11)
- [ ] Kate has been walked through checklists (Checklists 1–5 in MA-MEM-004) in a dedicated session
- [ ] Dry-run review completed: Founder and Kate complete Checklist 2 together on a synthetic memory
- [ ] Review Queue age monitoring in place (alert if any ELIGIBLE memory > 7 days old)
- [ ] Operating XP tracker set up (50 XP/week for clean queue)

### MEM-S3-03: First manual memories (optional)
- [ ] If Curator has not yet generated any ELIGIBLE memories, Founder may create 1–2 manual draft MemoryObjects based on observed patterns
- [ ] Manual memories go through full review checklist (Checklist 1 or 2 as appropriate)
- [ ] Manual memories labeled: `source_trajectory_ids` = UUIDs of the trajectories they are based on

### MEM-S3-04: Beehiiv stub evaluation (DEC-TIMS-008)
- [ ] Founder evaluates feasibility of basic Beehiiv → outcome_records stub pipeline in current sprint
- [ ] Decision documented: pull forward / defer to Sprint 5

---

## Sprint 4 Checklist — Denial Decoder Production Memory

**Trigger:** 5+ approved optimization memories, Kate review complete
**XP target:** 250 Build XP + 200 Signal XP

### MEM-S4-01: Denial Decoder memory enabled
- [ ] Founder has enabled `memory_enabled = TRUE` on Denial Decoder prompt template
- [ ] `allowed_memory_classes = ['optimization']` (strategy and recovery excluded at this stage)
- [ ] `ymyl_sensitivity = 'low'` confirmed on Denial Decoder template (lowest risk tool)
- [ ] At least 5 approved optimization-class memories exist for denial_decode workflow_type
- [ ] Kate has reviewed and approved all memories being enabled (Checklist 1 complete for each)

### MEM-S4-02: A/B tracking (lookalike)
- [ ] `memory_ids_injected` correctly populated in memory_retrieval_log for all executions
- [ ] `memory_was_injected` generated column confirmed working (query and verify)
- [ ] `user_action_post_retrieval` being populated from frontend events

### MEM-S4-03: Lift measurement query
- [ ] Lift measurement SQL query (from migration 005 comments) implemented and tested
- [ ] Founder can run query and see: positive_action_rate by memory_was_injected group
- [ ] Query results added to founder weekly dashboard
- [ ] Per-memory lift score update query implemented (updates `retrieval_lift_score` on memory_objects)

### MEM-S4-04 + MEM-S4-05: API cost measurement
- [ ] Cost distribution query implemented: api_cost_bucket distribution for memory vs. non-memory executions
- [ ] CFO Wealth Engineer extended: memory cost savings in weekly cost report

### MEM-S4-06 + MEM-S4-07: 30-day lift review
- [ ] 30+ days of data collected with memory enabled on Denial Decoder
- [ ] Founder reviews lift measurement results
- [ ] Decision made: expand to Denial Fighter? (positive lift required)
- [ ] Decision documented in Decision Log (new DEC-TIMS entry)

---

## Sprint 5 Checklist — Denial Fighter + Bill Dispute Memory Expansion

**Trigger:** Positive lift verified in Sprint 4 review + 30-day observation
**XP target:** 450 Build XP + YMYL gate

### MEM-S5-01 + MEM-S5-02: Memory enabled on Denial Fighter + Bill Dispute
- [ ] Positive lift from Sprint 4 verified and documented
- [ ] 🔒 Lift verification sign-off in Decision Log before enabling
- [ ] Founder enables `memory_enabled = TRUE` on Insurance Denial Fighter template
- [ ] `allowed_memory_classes = ['strategy', 'recovery', 'optimization']` set
- [ ] Founder enables `memory_enabled = TRUE` on Medical Bill Dispute Tool template
- [ ] Memory Curator expanded to cluster Denial Fighter and Bill Dispute trajectories (MEM-S5-03)

### MEM-S5-04 + MEM-S5-05: Strategy and recovery memories
- [ ] Memory Curator generates first strategy/recovery batch for denial workflows
- [ ] 🔒 ALL strategy and recovery memories reviewed with Checklist 2 (Founder + Kate dual sign-off)
- [ ] 🔒 Zero strategy or recovery memories approved without Kate review
- [ ] Discipline XP tracked: confirm zero YMYL bypasses

### MEM-S5-06 + MEM-S5-07: Beehiiv pipeline live
- [ ] Beehiiv 30-day follow-up survey responses parsed
- [ ] OutcomeRecord written for each survey response (outcome_type, confidence, source, memory_promotion_eligible)
- [ ] trajectory_event_id linked correctly (trajectory_events.outcome_id populated)
- [ ] outcome_records.memory_promotion_eligible logic validated: low-confidence = FALSE, pending = FALSE
- [ ] Memory Curator updated: uses positive_outcome_rate in quality gate (not just user_action proxy)
- [ ] First outcome-labeled memories scored and reviewed

---

## Sprint 6 Checklist — Resource Connector + Phase 3 Prep

**Trigger:** 500 trajectory events total + stable Review Queue discipline
**XP target:** 225 Build XP + 275 Signal/Discipline XP

### MEM-S6-01: Local Resource Connector memory enabled
- [ ] `memory_enabled = TRUE` on Local Resource Connector template
- [ ] `allowed_memory_classes = ['optimization']`
- [ ] `max_memories_injected = 2` confirmed

### MEM-S6-02: Auto-promotion pilot
- [ ] Auto-promotion criteria implemented: optimization-class, low-sensitivity, positive_outcome_rate >= 0.5, retrieval_count >= 20, compliance_flags clean
- [ ] Auto-promotion does NOT execute without 30-day observation period after qualifying
- [ ] Monday weekly digest (Node 13) is active and confirmed delivering auto-promotion reports (OQ-04)
- [ ] First auto-promotion: Founder reviews Monday digest and confirms correct notification

### MEM-S6-03: LegiScan integration
- [ ] LegiScan law change detection wired to `law_change_flagged = TRUE` on affected memories
- [ ] Auto-retire trigger tested: law_change_flagged = TRUE → memory_status check
- [ ] CTO Sentinel alert on law_change_flagged events

### MEM-S6-04 + MEM-S6-05: Phase 3 planning
- [ ] Approved memory count checked: if >= 50, Phase 3 pgvector planning initiated
- [ ] Phase 3 retrieval upgrade spec drafted (do not build yet)

### MEM-S6-06: 🔒 Hospital Mode firewall final audit
- [ ] Founder + Kate confirm: `hospital_mode_template = TRUE` on ALL Hospital Mode templates
- [ ] Count of Hospital Mode templates with firewall confirmed: ___
- [ ] Zero memories have been injected into Hospital Mode templates (query and confirm)
- [ ] Discipline XP: 50 XP awarded for Sprint 6 Hospital Mode discipline
- [ ] Decision Log entry: Hospital Mode firewall intact through Phase 2

---

## TIMS Phase 2 Definition of Done (from MA-MEM-001 §13)

Final checklist — TIMS Phase 2 is complete when ALL of the following are true:

- [ ] **Schema:** All 5 TIMS tables deployed with RLS, TypeScript types, Security Checklist PASS
- [ ] **Instrumentation:** generateLetter() emits TrajectoryEvents on every execution. Zero PII in any field. Kate-confirmed.
- [ ] **Registry:** Prompt Template Registry extended. All templates default memory_enabled = FALSE.
- [ ] **Hospital Mode firewall:** hospital_mode_template = TRUE on all Hospital Mode templates. Cannot be overridden.
- [ ] **Automation:** Memory Curator nightly, generates eligible drafts, notifies Review Queue.
- [ ] **Production memory:** ≥ 10 approved memories in production retrieval across ≥ 1 tool.
- [ ] **Measurement:** Lift measurement query operational. Founder reviews weekly.
- [ ] **Outcome labels:** OutcomeRecord linked to Beehiiv pipeline. Outcomes labeling trajectories.
- [ ] **YMYL compliance:** Zero strategy/recovery memories approved without Kate review.
- [ ] **Documentation:** All TIMS document IDs registered in Master Registry.
- [ ] **Gamification:** All XP events tracked and awarded per MA-MEM-001 §8.
