# /agent-scaffold

Generates a standard deployment packet for any new Board of Agents agent.
All agents must be scaffolded through this command — no ad hoc agent deployments.

## Usage
/agent-scaffold [agent name]

## Output Format

### Agent: [name]

**Agent ID:** [e.g., CTO-01, CFO-01, CMO-01]

**Role:** One sentence description of what this agent does.

**Board of Agents section:** §14 — which subsection does this agent appear in?

**Phase gate:** Which phase does this agent deploy in? (Phase 1 at launch / Signal 1 / Signal 2 / etc.)
- Do NOT scaffold a Phase 2+ agent for deployment in Phase 1. The gate is real.

**Trigger:**
- What causes this agent to run? (Cron schedule / Stripe webhook / n8n event / manual trigger)
- Frequency: [e.g., daily at 06:00 UTC, on every Stripe charge.failed event]

**Inputs:**
- List each input with source and data type
- Flag any input that contains PII — PII scrubber must run before input reaches any AI call

**Outputs:**
- What does this agent produce? (Alert, Google Sheets push, Notion update, n8n webhook, email, etc.)
- Output destination(s)

**trackedExecution() requirement:**
- Does this agent call any of the 6 canonical functions? (YES / NO)
- If YES: trackedExecution() must wrap those calls — launch blocker
- Langfuse trace schema: [reference shared trace schema in docs/architecture/langfuse-trace-schema.md]

**Logging:**
- What is logged on every run? (timestamp, status, flag count, error state, cost)
- Log destination: n8n execution log + Google Sheets Agent Status tab push

**Alerts:**
- What triggers an alert? (error state, cost spike, threshold breach)
- Alert method: n8n webhook → [destination: email / Google Sheets flag]

**Failure modes:**
- What happens if this agent fails silently? Describe the worst case.
- Retry logic: [max retries, backoff, dead letter handling]

**API cost note:**
- Estimated tokens per run (if AI calls are made)
- Frequency × estimated cost = monthly estimate
- Confirm this fits within the agent API budget (separate from user-facing API budget)

**n8n workflow file:** [path in repo, e.g., n8n/agents/cto-sentinel.json]

**Deployment checklist:**
- [ ] n8n workflow file committed to repo
- [ ] trackedExecution() confirmed on all canonical function calls
- [ ] Logging confirmed (execution log + Google Sheets push)
- [ ] Alerts configured
- [ ] Phase gate crossed before deployment

---
## MyAdvocate Rules This Command Enforces
- No agent deploys without phase gate cleared
- trackedExecution() on all canonical function calls — launch blocker
- PII scrubber on any AI call input
- Every agent logs to Google Sheets Agent Status tab
- Agent API budget tracked separately from user-facing API budget
- CTO Sentinel deploys at launch — all others wait for their gates
