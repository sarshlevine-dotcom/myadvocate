# n8n Agent Patterns

This skill covers the event schema, node patterns, retry logic, logging, and handoff architecture for all MyAdvocate n8n agents.
Load this whenever building, modifying, or debugging any n8n workflow.

## The Standard Workflow Pattern
Every n8n workflow follows this structure — no exceptions:

**Trigger → Transform → Decision → Action → Log**

1. **Trigger:** Webhook, cron, Stripe event, or manual. Always validate the trigger payload before proceeding.
2. **Transform:** Shape the data. Strip PII if any user data is present. Aggregate if destined for owner reporting.
3. **Decision:** Route based on conditions. Cost threshold? Error state? Gate crossed? Log the decision.
4. **Action:** Execute the primary function (send alert, push to Google Sheets, call Claude API, update Supabase).
5. **Log:** Write execution metadata to n8n execution log AND push status to Google Sheets Agent Status tab.

## The 6 Core Agents

### CTO Sentinel (deploys at launch — Phase 1)
- **Trigger:** Daily cron (06:00 UTC) + real-time Anthropic API cost webhook
- **Purpose:** API cost monitoring and alert system
- **Decision:** If daily spend > 80% of monthly cap → alert. If spend > 95% → emergency alert.
- **Action:** Push cost data to Google Sheets API Cost Log tab. Send alert via email if threshold breached.
- **trackedExecution():** Not required (no canonical function calls)

### CFO Wealth Engineer (deploys at launch — Phase 1)
- **Trigger:** Monthly cron (MPR trigger) + Stripe webhook (charge.succeeded, subscription events)
- **Purpose:** Financial dashboards and monthly reporting automation
- **Decision:** MRR vs. scenario path — flag divergence >15%
- **Action:** Push to Google Sheets MRR + Subs tab. Generate MPR financial summary to MPR Archive tab.
- **trackedExecution():** Not required (no canonical function calls)

### Cancel Flow (Phase 1)
- **Trigger:** Stripe customer.subscription.deleted event
- **Purpose:** Retention trigger — route through routeComplaint() for cancel reason capture, send win-back sequence via Beehiiv
- **Decision:** Cancel reason categorization → route to appropriate win-back message
- **Action:** routeComplaint() call (wrapped in trackedExecution()) → Beehiiv tag update → Google Sheets Subscriber Funnel update
- **trackedExecution():** REQUIRED on routeComplaint() call — launch blocker

### Outcome Tracking (activates after 100+ responses)
- **Trigger:** Webhook from case resolution update
- **Purpose:** Track appeal outcomes, feed Denial Intelligence Library
- **Decision:** Win/loss by denial code and payer type → flag codes with <40% win rate
- **Action:** Push aggregated outcome data to Google Sheets. Update DIL in Notion (never user-level data).
- **trackedExecution():** Not required (no canonical function calls in tracking step)

### Referral Routing (Signal 1)
- **Trigger:** User signals escalation intent (routeComplaint() output categorized as attorney-referral)
- **Purpose:** Route qualified cases to vetted attorney partners
- **Decision:** Case qualification check → attorney availability → privacy addendum confirmed?
- **Action:** routeComplaint() call (wrapped in trackedExecution()) → referral routing logic → attorney notification
- **Privacy gate:** HARD STOP if formal privacy addendum is not executed for the receiving attorney. No data transmits without it.
- **trackedExecution():** REQUIRED on routeComplaint() call — launch blocker

### OpenClaw Relay → REMOVED
OpenClaw Control Center has been removed from the MyAdvocate architecture.
Owner reporting runs through Google Sheets. No DigitalOcean Droplet required.
If you see an n8n workflow referencing OpenClaw or a DO Droplet endpoint, it is outdated and must be updated.

## Handoff Architecture

Data flows between systems via these n8n handoff patterns:

| Source | Destination | Method | Data Type |
|---|---|---|---|
| Stripe | Google Sheets MRR tab | Webhook → n8n → Sheets API | Aggregated MRR/sub metrics |
| Anthropic usage API | Google Sheets API Cost Log | Daily cron → n8n → Sheets API | Aggregated cost data |
| n8n execution log | Google Sheets Agent Status | Post-execution trigger → Sheets API | Status, flag count, error state |
| Langfuse | Google Sheets Canonical Health | Webhook or manual export | Error rate, quality score, cost per call |
| Beehiiv | n8n | Webhook on subscribe/unsubscribe | Subscriber events |
| Supabase | n8n | Webhook on case resolution | Aggregated (never user PII) |

## Logging Standard
Every agent execution must log:
- Timestamp (ISO 8601 UTC)
- Agent ID
- Trigger type
- Execution status (success / failure / skipped)
- Flag count (anomalies detected)
- Error message (if failure)
- API cost for this run (if AI calls made)
- Output destination confirmed (YES / NO)

Log destination: n8n execution log (built-in) + push status row to Google Sheets Agent Status tab.

## Retry Logic Standard
- Max retries: 3
- Backoff: exponential (1s, 2s, 4s)
- On final failure: send alert via email AND write FAIL status to Google Sheets Agent Status tab
- Dead letter handling: log failed payload to n8n execution log with full error context — do not silently discard

## Idempotency Rules
All workflows that create resources (folders, records, rows) must check before creating:
- Search for existing resource FIRST
- Only create if not found
- Log: "existing resource found — skipped creation" if duplicate detected
- This rule exists because the GWS service account created 4 duplicate Drive folders in 60 seconds — do not repeat this pattern

## trackedExecution() — Required on All Canonical Function Calls
If an n8n workflow calls any of the 6 canonical functions, that call must be wrapped in trackedExecution().
This is a launch blocker — no canonical function call ships without it.

The shared Langfuse trace schema must be used:
- See docs/architecture/langfuse-trace-schema.md for the full schema
- Trace fields: traceId, functionName, model, inputTokens, outputTokens, qualityScore, errorState, timestamp, userId (anonymized)
