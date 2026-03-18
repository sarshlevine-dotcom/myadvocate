# Dashboard Builds

This skill defines the design grammar and build rules for the MyAdvocate owner reporting layer.
Load this whenever building or modifying any owner reporting panel or tab.

## Current State: Google Sheets (Interim)
Owner reporting runs in Google Sheets until the Phase 3 unlock gate is crossed:
**Gate: Level 6 XP + $5,000 MRR**

Do NOT build a custom React dashboard or dashboard.myadvocate.com until this gate is crossed.

## Google Sheets Workbook Structure

### Tab Hierarchy (Priority Order)
1. **MRR + Subs** — Stripe data. MRR, sub count by plan, MoM change, churn rate, projected vs. scenario
2. **Traffic Gates** — Google Search Console. Monthly visitors vs. 6 signal gates. Current gate highlighted.
3. **API Cost Log** — Anthropic dashboard + n8n CTO Sentinel. Monthly spend, daily burn, % of cap.
4. **Agent Status** — n8n webhook push. Last run, flag count, error state per agent.
5. **XP + Level** — Self-reported. Current XP, level, streak, Commission Bank balance.
6. **Reserve Status** — Stripe + manual. Reserve months, phase floor, trigger distance.
7. **Subscriber Funnel** — Stripe + Supabase export. Free → paid conversion, churn, net new subs, ARPU.
8. **Content Backlog** — Notion export or manual. Articles in queue, next publish, weeks of buffer.
9. **Canonical Function Health** — Langfuse export or webhook. Error rates, quality scores, cost per call.
10. **MPR Archive** — Manual entry. Monthly review log, scenario drift notes, decision triggers.
11. **Projection Calibrator** — Formula-driven. Actual vs. Conservative/Expected/Optimistic at every MPR.

### Conditional Formatting Rules (Apply to All Numeric Metrics)
- **Green:** Within 10% of scenario path / on target
- **Yellow:** 10–20% divergence — monitor, note in MPR
- **Red:** >20% divergence — trigger scenario recalibration review

### Column Standards
- Date columns: ISO format (YYYY-MM-DD)
- Currency: USD, no cents for MRR/reserve (round to dollar). Cents for per-call API cost.
- Percentages: display as % with 1 decimal place
- Status columns: use text values (PASS / WARN / FAIL) with conditional formatting, not just colors

## Data Push Architecture (Google Sheets ← n8n)

n8n pushes to Google Sheets via Google Sheets API node on these triggers:
- **Agent Status tab:** After every n8n agent execution (success or failure)
- **API Cost Log tab:** Daily cron from CTO Sentinel cost check
- **MRR + Subs tab:** After every Stripe charge.succeeded or customer.subscription.updated event

For all other tabs: manual entry during weekly Thursday Business Operations block or monthly MPR.

## Privacy Rule (Absolute)
The owner reporting layer reads aggregated metrics only. It must never contain:
- Individual user records
- Names, emails, or case content
- Raw Supabase query results at the user level
- Any PII

All n8n webhook payloads to Google Sheets must be aggregated before transmission. If a payload contains user-level data, it must be rejected and rebuilt.

## Signal-Gated Tab Additions
| Signal Gate | New Tab Unlocked |
|---|---|
| Signal 1 (10k visitors) | Referral Attribution, Attorney Pipeline, Email Growth Rate |
| Signal 2 (25k visitors) | Cohort Analysis, Content Cluster Performance |
| Signal 3 (40k visitors) | Outcome Tracking, Win Rate Trend, Referral Revenue |
| Signal 4 (65k visitors) | B2B Pipeline, Native App Fund Progress |

## Custom React Dashboard (Phase 3+ Only)

**Do not reference this section until Level 6 XP + $5,000 MRR gate is crossed.**

When the gate is crossed, the React dashboard replaces Google Sheets for owner reporting.
Build spec will be generated via /build-dashboard-panel command at that time.

Design grammar for future React build (reference only — do not implement):
- Mission control layout: most critical metrics top-left, cascade right and down by decision priority
- Color system: Green (on track) / Yellow (monitor) / Red (diverge) — same logic as Sheets
- Every panel answers one question. No panel without a named decision it supports.
- Canonical Function Health panel required in v1 React build (Langfuse integration)
- Projection Calibrator panel required in v1 React build
