---
status: DEFERRED — signal-gated
ma_doc: MA-AGT-001 §Signal-Gated Agents
---

# Signal-Gated Agents — Not Yet Active

The following agents are specified in MA-AGT-001 but are deferred until traffic signals are reached. Do not install or activate until the stated trigger condition is met.

## Deployment Schedule

| Agent | MA ID | Trigger | Function |
|---|---|---|---|
| MKT-01 Reddit Community Builder | MA-AGT-009 | T-60 before Signal 1 (8,333 visitors/month) | Authentic Reddit presence in r/HealthInsurance, r/ChronicIllness |
| MKT-03 Social Proof Amplifier | MA-AGT-010 | Signal 1 (10,000 visitors) | Testimonials, social proof, review strategy |
| PRD-01 Product Intelligence Analyst | MA-AGT-011 | Signal 1 (10,000 visitors) | User behavior analysis, feature prioritization |
| MKT-02 Affiliate Program Builder | MA-AGT-012 | Signal 2 (16,180 visitors) | Patient advocacy affiliate channel |

## Signal Definitions

**Signal 1:** 10,000 unique visitors/month sustained for 2 consecutive months  
**Signal 2:** 16,180 unique visitors/month (Fibonacci: 10,000 × 1.618)

## Activation Protocol

When a signal is reached:
1. Confirm signal is sustained (2 consecutive months, not a spike)
2. Check Parking Lot in Notion — confirm agent is not blocked by other gate condition
3. Founder activates manually — no autonomous deployment
4. Document activation in decisions.json (dec_ prefix, decision_type = "ops")

## Why Deferred

Deploying marketing agents before organic traction is validated wastes resources and creates false signal. These agents serve real business functions but only when the business signal they monitor is real.
