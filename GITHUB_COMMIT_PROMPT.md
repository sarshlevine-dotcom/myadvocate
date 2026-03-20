# GitHub Repo Update — MA-AGT-002 Agent Hierarchy & OpenHands Integration

## Commit Message

```
feat: install agent hierarchy + OpenHands integration (MA-AGT-002)

- Replace flat .claude/agents/ model with 5-director hierarchical org
- Install 29 agent files across orchestration/, implementation/,
  content-ymyl/, growth/, runtime-mirrors/ subdirectories
- Preserve Phase 1 agents in legacy-phase1/ (GEO/DEV/CNT series)
- Add config layer: agent_hierarchy.yaml, reporting_matrix.yaml,
  handoff-rules.yaml, event-taxonomy.yaml, dashboard panels, schemas
- Create agent-task-mapping.json linking agents to Phase 2 priorities
- Update context_registry: 5 new sources, 2 new decisions
- Update CLAUDE.md: new Agent Hierarchy + OpenHands sections,
  3 new Core Invariants, updated Repo Map and Canonical Docs
- Add MA-AGT-002 integration report (docs/agents/)

Closes: MA-AGT-002 Tier 1 install
```

## Files Changed

### New Files (42)
```
.claude/agents/orchestration/founder-chief-of-staff.md
.claude/agents/orchestration/task-router.md
.claude/agents/orchestration/build-director.md
.claude/agents/orchestration/content-compliance-director.md
.claude/agents/orchestration/growth-ops-director.md
.claude/agents/orchestration/finance-risk-director.md
.claude/agents/implementation/backend-architect.md
.claude/agents/implementation/supabase-schema-architect.md
.claude/agents/implementation/ai-systems-engineer.md
.claude/agents/implementation/agent-runtime-engineer.md
.claude/agents/implementation/dashboard-command-center-builder.md
.claude/agents/implementation/security-privacy-reviewer.md
.claude/agents/implementation/qa-release-reviewer.md
.claude/agents/content-ymyl/ymyl-compliance-writer.md
.claude/agents/content-ymyl/legal-citation-checker.md
.claude/agents/content-ymyl/denial-intelligence-architect.md
.claude/agents/content-ymyl/seo-cluster-architect.md
.claude/agents/growth/social-distribution-operator.md
.claude/agents/growth/newsletter-operator.md
.claude/agents/growth/referral-pipeline-analyst.md
.claude/agents/growth/b2b-pipeline-analyst.md
.claude/agents/runtime-mirrors/cto-sentinel-spec.md
.claude/agents/runtime-mirrors/cfo-wealth-engineer-spec.md
.claude/agents/runtime-mirrors/cmo-content-strategist-spec.md
.claude/agents/runtime-mirrors/coo-operating-coordinator-spec.md
.claude/agents/runtime-mirrors/cpo-product-intelligence-spec.md
.claude/agents/runtime-mirrors/clo-legal-monitor-spec.md
.claude/agents/runtime-mirrors/cro-revenue-optimizer-spec.md
.claude/agents/runtime-mirrors/ai-compliance-spec.md
config/agent_runtime/agent_hierarchy.yaml
config/agent_runtime/reporting_matrix.yaml
config/agent_runtime/handoff-rules.yaml
config/agent_runtime/event-taxonomy.yaml
config/agent_runtime/agent-task-mapping.json
config/agent_runtime/registry/*.json (8 files)
config/agent_runtime/templates/*.json (2 files)
config/agent_runtime/dashboard/panels/*.json (7 files)
config/agent_runtime/dashboard/sql/01_views.sql
docs/agents/MA-AGT-002_Agent_Hierarchy_Integration.docx
```

### Moved Files (8 — to legacy-phase1/)
```
.claude/agents/GEO-01-content-architect.md → .claude/agents/legacy-phase1/
.claude/agents/GEO-02-technical-foundation.md → .claude/agents/legacy-phase1/
.claude/agents/GEO-03-denial-code-writer.md → .claude/agents/legacy-phase1/
.claude/agents/DEV-01-security-engineer.md → .claude/agents/legacy-phase1/
.claude/agents/DEV-02-backend-architect.md → .claude/agents/legacy-phase1/
.claude/agents/DEV-03-reality-checker.md → .claude/agents/legacy-phase1/
.claude/agents/CNT-01-ymyl-compliance-writer.md → .claude/agents/legacy-phase1/
.claude/agents/_SIGNAL_GATED_AGENTS.md → .claude/agents/legacy-phase1/
```

### Modified Files (3)
```
CLAUDE.md — Agent Hierarchy section, OpenHands section, Core Invariants, Repo Map, Canonical Docs, Recent Changes
context_registry/sources.json — src_0014 through src_0018
context_registry/decisions.json — dec_0015 and dec_0016
```
