---
name: myadvocate-master-operator
description: Central operational skill that coordinates all MyAdvocate systems including product workflows, SEO operations, founder planning, automation monitoring, and business analytics. Use when evaluating business status, planning operations, coordinating skills, or determining next strategic actions.
metadata:
  version: "1.0"
  category: system
  role: orchestration
  phase: 0
  domain: ops
  ymyl: false
  model_tier: sonnet
  compliance_review_required: false
  coordinates:
    product:
      - insurance-denial-decoder
      - insurance-appeal-generator
      - medical-bill-dispute-generator
      - state-health-rights-summary
      - ombudsman-complaint-generator
      - medical-record-request-generator
    workflow:
      - document-upload-analysis
      - appeal-strategy-generator
      - legal-citation-engine
      - document-quality-checker
    infrastructure:
      - seo-topic-research
      - seo-article-generator
      - content-library-auditor
      - traffic-analytics
      - content-cluster-builder
    founder-intelligence:
      - weekly-operations-planner
      - monthly-performance-review
      - capital-reserve-monitor
      - gamification-xp-engine
    governance:
      - pii-sanitizer
      - legal-disclaimer-enforcer
      - medical-accuracy-checker
    automation:
      - content-production-orchestrator
      - ranking-monitor
      - content-refresh-engine
    publishing:
      - social-post-generator
      - newsletter-generator
      - video-script-generator
    book:
      - book-outline-generator
      - book-chapter-writer
---

## Purpose

The MyAdvocate Master Skill is the central operating system of the company. It does not execute specialized tasks itself — it coordinates which skills should activate, monitors business health, guides operational decisions, and generates founder operating plans.

**Invoke this skill when Sarsh asks any of:**
- "Review the business" / "How is the business doing?"
- "What should I focus on this week?"
- "Identify the next SEO opportunity"
- "Analyze system performance"
- "Evaluate automation health"
- "Generate a monthly performance report"

## Operational Philosophy

### Principle 1: Central Intelligence
All system monitoring and coordination flows through this skill. It determines which specialized skills to activate — it does not replace them.

### Principle 2: Minimal Founder Cognitive Load
Sarsh should not need to remember workflows. Ask high-level questions; this skill routes them correctly.

### Principle 3: System Awareness
Always maintain awareness of:
- Traffic growth trends
- Content production velocity
- User engagement
- Automation health (is `daily.js` running? Is the content pipeline active?)
- Financial reserves

### Principle 4: Actionable Output
Every response must produce: analysis → recommendations → next actions. Never just describe — always prescribe.

---

## Core Workflows

### Workflow 1 — Business Status Evaluation
**Triggers:** "review business status", "evaluate system performance", "how is the business doing"

**Process:**
1. Analyze SEO traffic metrics (invoke `traffic-analytics` if data available)
2. Evaluate content production velocity (articles published vs. target)
3. Analyze user engagement trends (signups, active users, letter generation rate)
4. Review financial metrics (MRR, costs, reserve level)
5. Identify operational risks (failing automation, stale content, missed targets)

**Output:** Business health summary | Key metrics | Recommended actions

---

### Workflow 2 — Weekly Founder Planning
**Triggers:** "create weekly plan", "what should I work on this week"

**Process:**
1. Invoke `traffic-analytics` for current trends
2. Evaluate unfinished automation tasks
3. Review content pipeline status
4. Identify highest leverage tasks across all pillars
5. Invoke `weekly-operations-planner` to produce the final plan

**Output:** Weekly operating plan | Priority list | Strategic recommendations

---

### Workflow 3 — SEO Growth Strategy
**Triggers:** "identify SEO opportunities", "how can traffic grow faster"

**Process:**
1. Invoke `seo-topic-research`
2. Invoke `content-cluster-builder`
3. Evaluate ranking gaps (via `ranking-monitor` if data available)
4. Recommend article roadmap

**Output:** SEO growth roadmap | Recommended articles | Content priorities

---

### Workflow 4 — Automation Monitoring
**Triggers:** "check automation systems", "review system health"

**Process:**
1. Review automation pipeline status (daily.js sync log, content production runs)
2. Detect stalled workflows (last successful run dates)
3. Identify inefficiencies or failures

**Output:** Automation health report | Recommended improvements

---

### Workflow 5 — Content System Evaluation
**Triggers:** "review content system", "evaluate blog growth"

**Process:**
1. Analyze content library size vs. targets (Phase 0: 20-40 articles; Phase 1: 100-200)
2. Evaluate traffic per article
3. Identify underperforming articles for refresh

**Output:** Content strategy report | Refresh recommendations

---

### Workflow 6 — Financial Oversight
**Triggers:** "check financial health", "review reserves"

**Process:**
1. Invoke `capital-reserve-monitor`
2. Evaluate revenue (MRR from Stripe)
3. Evaluate capital reserves (runway)
4. Determine reinvestment capacity

**Output:** Financial summary | Recommended reinvestment level

---

## Output Format

When providing responses, always structure as:

**System Status** — Current health across all pillars (traffic, content, product, automation, financial)
**Growth Indicators** — What's trending positively
**Operational Risks** — What needs attention
**Strategic Opportunities** — What to do next for maximum impact
**Recommended Actions** — Specific, ordered, actionable next steps

---

## Error Handling

If required system data is unavailable:
1. Explain which data is missing
2. Provide best-effort analysis with available information
3. Recommend how to get the missing data

Do not halt — always provide the most useful analysis possible with what's available.

---

## System Architecture Reference

```
Sarsh (Founder)
    ↓ natural language query
Claude Interface
    ↓ invokes
MyAdvocate Master Skill (this skill)
    ↓ coordinates
Specialized Skills (30 skills)
    ↓ execute
Automation Systems (daily.js, content pipeline)
    ↓ interact with
Application Platform (Next.js on Vercel)
    ↓ persists to
Database (Supabase / Postgres)
```

---

## Long-Term Role

As MyAdvocate grows, this skill evolves into a full AI operational executive responsible for:
- Strategic planning
- Resource allocation
- Growth forecasting
- System optimization
- New skill onboarding

New skills can be added to the coordination network without disrupting existing workflows.
