# Notion Tasks — MA-AGT-002 Agent Hierarchy & OpenHands Integration

## Sprint 1 Tasks (Create Now)

### Tier 1 — COMPLETED (2026-03-19)
| Task | Status | MA ID | Agent Owner |
|------|--------|-------|-------------|
| Install agent hierarchy (29 files, 5 subdirs) | ✅ Done | MA-AGT-002 T1-01 | Founder |
| Install config layer (hierarchy, reporting, handoff, events) | ✅ Done | MA-AGT-002 T1-02 | Founder |
| Create agent-task-mapping.json | ✅ Done | MA-AGT-002 T1-03 | Founder |
| Update context_registry (sources + decisions) | ✅ Done | MA-AGT-002 T1-04 | Founder |
| Update CLAUDE.md (hierarchy + OpenHands sections) | ✅ Done | MA-AGT-002 T1-05 | Founder |
| Generate MA-AGT-002 integration report (.docx) | ✅ Done | MA-AGT-002 T1-06 | Founder |
| Git commit + push to GitHub | 🔲 Pending | MA-AGT-002 T1-07 | Founder |

### Tier 2 — This Sprint (Weeks 2-4)
| Task | Status | MA ID | Agent Owner | Depends On |
|------|--------|-------|-------------|------------|
| Wire event taxonomy into decision_log + friction_events tables | 🔲 Pending | MA-AGT-002 T2-01 | IMP_DB_001 (Schema Architect) | Migration 023 deployed |
| Activate CTO Sentinel runtime-mirror as scoring service ref | 🔲 Pending | MA-AGT-002 T2-02 | DIR_TRC_001 (Finance & Risk) | V4 Scoring Service live |
| Activate CFO Wealth Engineer runtime-mirror as scoring service ref | 🔲 Pending | MA-AGT-002 T2-03 | DIR_TRC_001 (Finance & Risk) | V4 Scoring Service live |
| Set up OpenHands (install, configure, test with sandbox task) | 🔲 Pending | MA-AGT-002 T2-04 | DIR_ENG_001 (Build Director) | — |
| Create GitHub issue template for OpenHands tasks | 🔲 Pending | MA-AGT-002 T2-05 | DIR_ENG_001 (Build Director) | T2-04 |
| Write task spec: Content validation CLI script | 🔲 Pending | MA-AGT-002 T2-06 | OPENHANDS_001 | T2-04 |
| Write task spec: Pre-launch engineering check command | 🔲 Pending | MA-AGT-002 T2-07 | OPENHANDS_001 | T2-04 |
| Write task spec: Server/client boundary audit | 🔲 Pending | MA-AGT-002 T2-08 | OPENHANDS_001 | T2-04 |
| Execute first 3 OpenHands tasks + review PRs | 🔲 Pending | MA-AGT-002 T2-09 | Founder | T2-06, T2-07, T2-08 |

### Tier 3 — Month 2+ (Phase 2 Mid-Sprint)
| Task | Status | MA ID | Agent Owner | Depends On |
|------|--------|-------|-------------|------------|
| Build Chief of Staff inbox dashboard panel | 🔲 Pending | MA-AGT-002 T3-01 | IMP_DASHBOARD_001 | Event logging live |
| Wire OpenHands to n8n triggers (low-risk categories) | 🔲 Pending | MA-AGT-002 T3-02 | IMP_AUTOMATION_001 | n8n + OpenHands both live |
| Deploy dashboard SQL views (01_views.sql) | 🔲 Pending | MA-AGT-002 T3-03 | IMP_DB_001 | Event logging tables exist |
| Activate growth agents as Signal 1 approaches | 🔲 Pending | MA-AGT-002 T3-04 | DIR_GRO_001 | Signal 1 sustained |
| 30-day OpenHands review — decide Stage 2 activation | 🔲 Pending | MA-AGT-002 T3-05 | Founder | T2-09 + 30 days |

## Agent Activation Tracker (Add to Notion Agent Registry)

Track when each agent should auto-connect to tasks. Copy to Notion as a database view.

| Agent ID | Agent Name | Status | Activation Trigger | Auto-Connect To Tasks |
|----------|-----------|--------|-------------------|----------------------|
| FOUNDER_COS_001 | Founder Chief of Staff | ✅ Active | Immediate | All director reporting |
| TASK_ROUTER_001 | Task Router | ✅ Active | Immediate | All incoming requests |
| DIR_ENG_001 | Build Director | ✅ Active | Immediate | Priorities #6,9,31-33,39-40,53-56 |
| DIR_CTK_001 | Content & Compliance Dir. | ✅ Active | Immediate | Priorities #19,21,28,36 |
| DIR_GRO_001 | Growth & Ops Director | ✅ Active (light) | Full at Signal 1 | Priorities #11,29,30 |
| DIR_TRC_001 | Finance & Risk Director | ✅ Active | Immediate | Priorities #9,40,53,58,60 |
| IMP_BACKEND_001 | Backend Architect | ✅ Active | Immediate | Priorities #31-33 |
| IMP_DB_001 | Supabase Schema Architect | ✅ Active | Immediate | Priority #6 |
| IMP_AI_001 | AI Systems Engineer | ✅ Active | Immediate | Priorities #18,26,50 |
| IMP_AUTOMATION_001 | Agent Runtime Engineer | ✅ Active | Immediate | Priorities #9,10,40-41,43,46,53-55 |
| IMP_DASHBOARD_001 | Dashboard Builder | ⏳ Deferred | After n8n + scoring live | Priorities #22,48-49,58 |
| IMP_QA_001 | QA & Release Reviewer | ✅ Active | Immediate | All releases |
| IMP_SECURITY_001 | Security & Privacy Reviewer | ✅ Active | Immediate | All security-touching changes |
| CTK_YMYL_001 | YMYL Compliance Writer | ✅ Active | Immediate | Priority #28 |
| CTK_CITATION_001 | Legal Citation Checker | ✅ Active | Immediate | Priority #28 |
| CTK_DENIAL_001 | Denial Intelligence Architect | ✅ Active | Immediate | Priority #20 |
| CTK_SEO_001 | SEO Cluster Architect | ✅ Active | Immediate | Priorities #16,28,44-45 |
| RUNTIME_CTO_001 | CTO Sentinel | ✅ Active | Day 1 | Priorities #40,56 |
| RUNTIME_CFO_001 | CFO Wealth Engineer | ✅ Active | First subscriber | Priorities #46,53 |
| RUNTIME_AI_COMP_001 | AI Compliance Monitor | ⏳ Deferred | Phase 2 public launch | Priority #60 |
| RUNTIME_CMO_001 | CMO Content Strategist | ⏳ Deferred | Signal 1 | Priorities #43-44 |
| RUNTIME_COO_001 | COO Operating Coordinator | ⏳ Deferred | Signal 1 | — |
| RUNTIME_CPO_001 | CPO Product Intelligence | ⏳ Deferred | Signal 2 | — |
| RUNTIME_CLO_001 | CLO Legal Monitor | ⏳ Deferred | Signal 3 | — |
| RUNTIME_CRO_001 | CRO Revenue Optimizer | ⏳ Deferred | Signal 4 | — |
| GRO_SOCIAL_001 | Social Distribution Operator | ✅ Active (light) | Pre-Signal 1 | Priority #30 |
| GRO_NEWSLETTER_001 | Newsletter Operator | ⏳ Deferred | Signal 1 | Priority #29 |
| GRO_REFERRAL_001 | Referral Pipeline Analyst | ⏳ Deferred | Signal 1 | — |
| GRO_B2B_001 | B2B Pipeline Analyst | ⏳ Deferred | Signal 5 | — |
| OPENHANDS_001 | OpenHands Coding Agent | ⏸️ Setup | Tier 1 + first task spec | New bounded tasks |
