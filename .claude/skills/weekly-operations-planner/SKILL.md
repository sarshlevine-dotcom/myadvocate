---
name: weekly-operations-planner
description: Generates a weekly operating plan for the founder based on system priorities.
metadata:
  version: "1.0"
  category: founder-intelligence
  phase: 0
  domain: ops
  ymyl: false
  model_tier: sonnet
  compliance_review_required: false
  depends_on:
    - traffic-analytics
    - myadvocate-master-operator
  triggers:
    - "create weekly plan"
    - "what should I work on this week"
    - "weekly priorities"
    - "Monday plan"
    - "weekly operating plan"
---

## Purpose

Produce a concrete, prioritized weekly action plan for Sarsh that balances product, content, growth, and automation work.

## Instructions

### Step 1 — Analyze business status
Before generating the plan, assess current state across all dimensions:
- **Product:** Any open bugs, user feedback, critical fixes needed?
- **Content:** Articles in progress, publishing queue, SEO opportunities?
- **SEO/Traffic:** Any significant changes requiring immediate action?
- **Automation:** Is `daily.js` running? Any pipeline failures?
- **Revenue/Users:** New signups, churn signals, conversion issues?

### Step 2 — Prioritize tasks
Apply the following priority framework:
1. **P0 — Blocking:** Anything preventing users from using the product
2. **P1 — Revenue impact:** Tasks directly tied to conversion or retention
3. **P2 — Growth:** SEO content, traffic, acquisition
4. **P3 — Infrastructure:** Automation improvements, technical debt
5. **P4 — Future:** Phase 2+ planning, research

### Step 3 — Generate weekly plan
Structure the week as:
- **Monday:** Assessment + highest leverage P0/P1 task
- **Tuesday-Wednesday:** Primary content or product work
- **Thursday:** SEO/growth work or automation check
- **Friday:** Review, light tasks, plan next week

Limit to 3-5 real tasks per day — protect deep work time.

## Output Format

**Week of [date]**

**This Week's Priority:** [single most important thing]

**Daily Breakdown:**
- Mon: [1-2 tasks]
- Tue: [1-2 tasks]
- Wed: [1-2 tasks]
- Thu: [1-2 tasks]
- Fri: [1 task + review]

**Metrics to Watch:** [2-3 numbers to track this week]

**Decisions Needed:** [anything requiring founder judgment this week]

## Notes

- If the founder asks "what should I do today?" invoke this skill for the week, then narrow to today
- Protect at least 2 hours per day of uninterrupted building time
- Check `daily.js` sync log on Monday to confirm automation is running
