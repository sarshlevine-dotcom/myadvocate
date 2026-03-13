# TIMS Implementation Index
**MyAdvocate — Trajectory-Informed Memory System**
**Phase 2 Implementation Package | v1.0 | 2026-03**

This index is the single entry point for the TIMS implementation. Read this first. All other documents are referenced from here.

---

## What This Package Contains

| File | Document ID | Purpose | Read When |
|---|---|---|---|
| `MA-TRJ-001_Trajectory_Event_Taxonomy.md` | MA-TRJ-001 | Locked enum values for all TIMS database fields | **BEFORE Sprint 1** — must be locked before any schema deployment |
| `MA-MEM-002_Schema/001_trajectory_events.sql` | MA-MEM-002 | Supabase migration: trajectory_events table | Sprint 1 |
| `MA-MEM-002_Schema/002_memory_objects.sql` | MA-MEM-002 | Supabase migration: memory_objects table | Sprint 1 |
| `MA-MEM-002_Schema/003_prompt_template_memory_config.sql` | MA-MEM-002 | Supabase migration: Prompt Template Registry extension | Sprint 2 |
| `MA-MEM-002_Schema/004_outcome_records.sql` | MA-MEM-002 | Supabase migration: outcome_records + trajectory FK | Sprint 1–2 |
| `MA-MEM-002_Schema/005_memory_retrieval_log.sql` | MA-MEM-002 | Supabase migration: memory_retrieval_log | Sprint 4 |
| `MA-MEM-002_Schema/tims.types.ts` | MA-MEM-002 | TypeScript type definitions for all TIMS objects | Sprint 1 (implement alongside migrations) |
| `MA-MEM-003_Memory_Curator_Workflow_Spec.md` | MA-MEM-003 | n8n workflow: 13-node Memory Curator + system prompt | Sprint 3 (Kate reviews system prompt first) |
| `MA-MEM-004_Review_Queue_SOP.md` | MA-MEM-004 | Review Queue operating procedure + all 5 checklists | **Before Sprint 3** — Kate onboarding required |
| `TIMS_Decision_Log.md` | MA-DEC | All resolved open questions + binding decisions | Anytime — living document |
| `TIMS_Sprint_Checklists.md` | — | Per-sprint Definition of Done checklists | Each sprint before starting |

---

## Migration Run Order

Migrations must be run in this exact sequence:

```
001_trajectory_events.sql        ← Creates all shared enum types
002_memory_objects.sql           ← References tims_workflow_type from 001
003_prompt_template_memory_config.sql  ← References tims_ymyl_sensitivity from 002
004_outcome_records.sql          ← References trajectory_events FK from 001
005_memory_retrieval_log.sql     ← References trajectory_events FK from 001
```

After running 003, immediately run the Hospital Mode template UPDATE statement (documented in that migration) and verify the count. This is a Sprint 1 security gate.

---

## Critical Path Summary

### Before any code:
1. Lock MA-TRJ-001 taxonomy (Founder)
2. Resolve all OQs (done — see Decision Log)
3. Register 5 document IDs in Master Registry (Founder)
4. Brief Kate on her review role and walk through MA-MEM-004 checklists

### Sprint 1 (now, parallel to Phase 2 tool builds):
- Run migrations 001, 002, 004 in Supabase staging
- Implement TypeScript types
- Run migration 003 + flag Hospital Mode templates
- Complete Sprint 1 Security Audit Gate (MEM-S1-07) — Kate sign-off required
- Calibrate cost/duration bucket thresholds

### Sprint 2:
- Run migration 003 if not done in Sprint 1
- Instrument generateLetter() with pre/post TIMS hooks
- Kate reviews 10 sample trajectory events for PII compliance

### Sprint 3 (after 100 events or 30 days):
- Kate reviews and approves Memory Curator system prompt (Checklist 5)
- Build and activate Memory Curator n8n workflow (13 nodes per MA-MEM-003)
- Wire Review Queue notifications
- Run migration 005 (memory_retrieval_log)

### Sprint 4:
- Enable memory on Denial Decoder (optimization only)
- Implement lift measurement query
- 30-day observation → lift review decision

### Sprint 5:
- Expand to Denial Fighter + Bill Dispute (after positive lift confirmed)
- Wire Beehiiv → outcome_records pipeline
- First strategy/recovery memories (dual Founder + Kate sign-off per Checklist 2)

### Sprint 6:
- Enable Local Resource Connector (optimization only)
- Auto-promotion pilot (optimization, low-sensitivity only)
- LegiScan law change integration
- Hospital Mode firewall final audit (Founder + Kate)

---

## Key Contacts

| Role | Responsibility in TIMS |
|---|---|
| Founder | Schema decisions, taxonomy lock, Review Queue sign-off (all classes), auto-promotion decisions, weekly digest review |
| Kate | Clinical review of strategy/recovery/high-sensitivity memories (Checklists 2–3), Memory Curator system prompt review (Checklist 5), Sprint 2 privacy audit |
| Claude Code | All schema migrations, generateLetter() instrumentation, Memory Curator n8n build, lift measurement queries, LegiScan integration |
| Memory Curator (n8n) | Nightly automated trajectory analysis, draft memory generation, Review Queue notification, Monday digest |
| CTO Sentinel | Memory retrieval error monitoring, law_change_flagged alerts, retirement event monitoring |
| CFO Wealth Engineer | API cost savings from optimization-class memories, weekly cost report extension |

---

## Gamification Milestone Tracker

| Milestone | Condition | Status |
|---|---|---|
| 🏆 Build: Schema deployed | Migrations 001–002 + TypeScript live | ⬜ |
| 🏆 Build: generateLetter() instrumented | First TrajectoryEvent in production | ⬜ |
| 📊 Signal: 100 trajectory events | Memory Curator activation gate | ⬜ |
| 📊 Signal: 500 trajectory events | Auto-promotion + Resource Connector gate | ⬜ |
| 🏆 Build: First approved memory in production | System end-to-end validated | ⬜ |
| 📊 Signal: First positive lift event | Memory system proven | ⬜ |
| 💰 Signal: First cost reduction from optimization memory | Cost discipline confirmed | ⬜ |
| 🏆 Milestone 1: Memory System Live | 1st approved memory in production retrieval | ⬜ |
| 🏆 Milestone 2: Lift Verified | First statistically observed positive lift | ⬜ |
| 🏆 Milestone 3: Cost Intelligence | First optimization memory confirmed cost reduction | ⬜ |
| 🏆 Milestone 4: Memory at Scale | 50 approved memories → Phase 3 pgvector planning | ⬜ |
| 🔒 Discipline: Hospital Mode firewall | Maintained all of Phase 2 | ⬜ |
| 🔒 Discipline: Zero YMYL bypasses | No strategy/recovery memory approved without Kate | ⬜ |

---

## Document Registry Status

These five document IDs must be registered in the MyAdvocate Master Registry before Sprint 1:

| Document ID | Title | Status |
|---|---|---|
| MA-MEM-001 | TIMS Architecture & Integration Supplemental | Register (source document) |
| MA-MEM-002 | TIMS Database Schema | Register (migrations + types in this package) |
| MA-MEM-003 | Memory Curator n8n Workflow Specification | Register (in this package) |
| MA-MEM-004 | Memory Review Queue Operating Procedure | Register (in this package) |
| MA-TRJ-001 | Trajectory Event Taxonomy | Register (in this package) |
