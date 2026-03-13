# MA-MEM-003 — Memory Curator n8n Workflow Specification
**Family:** Memory (MEM) | **Authority Level:** Implementation Reference
**Status:** Draft v1.0 | **Date:** 2026-03
**Authority:** MA-MEM-001 | **Taxonomy:** MA-TRJ-001
**Owner:** Founder | **Build Owner:** Claude Code
**Sprint:** Phase 2 Sprint 3 | **Signal Gate:** 100 trajectory events collected OR 30 days post-Sprint 2

---

## 1. Overview

The Memory Curator is an n8n automated workflow that runs on a nightly schedule. It processes completed, labeled trajectory events, identifies differentiated patterns, and generates draft MemoryObjects for human review.

It is **not** a standalone model. It does not have direct access to user data. It operates exclusively on scrubbed, bucketed trajectory data.

**Schedule:** Nightly at 2:00 AM (local server time), seven days a week.

**Trigger condition before activation:** 100+ trajectory events in the database OR 30 days after Sprint 2 completion, whichever comes first. Do not run the Curator before this threshold — cluster analysis on fewer events produces unreliable patterns.

---

## 2. Workflow Architecture (n8n Nodes)

### Node 0: Schedule Trigger
- **Type:** Schedule Trigger
- **Schedule:** `0 2 * * *` (nightly at 2am)
- **On error:** Notify CTO Sentinel via webhook; halt workflow

### Node 1: Load State
- **Type:** Supabase / HTTP Request
- **Action:** Read `tims_curator_state` from a config table (or Supabase KV) to get `last_run_at`
- **Output:** `{{ $json.last_run_at }}` (ISO timestamp)
- **First run default:** `NOW() - INTERVAL '7 days'` to process recent history

### Node 2: Collect Labeled Trajectories
- **Type:** Supabase Query
- **Query:**
```sql
SELECT
  te.*,
  or_.outcome_type,
  or_.confidence,
  or_.memory_promotion_eligible,
  or_.source AS outcome_source
FROM trajectory_events te
JOIN outcome_records or_ ON or_.trajectory_event_id = te.id
WHERE
  te.created_at > '{{ $json.last_run_at }}'
  AND or_.memory_promotion_eligible = true
  AND te.output_class IN ('letter_generated', 'explanation_only')
ORDER BY te.workflow_type, te.denial_code_family, te.insurer_category, te.state_code
```
- **Output:** Array of labeled trajectory events
- **If count = 0:** Log "No new labeled trajectories. Skipping." → Update state → End

### Node 3: Cluster Builder
- **Type:** Code Node (JavaScript)
- **Purpose:** Group trajectories into clusters by their cluster key
- **Cluster key:** `(workflow_type, denial_code_family, insurer_category, state_code)`
- **Minimum cluster size:** 10 events (discard clusters with fewer)

```javascript
const trajectories = $input.all().map(item => item.json);
const clusters = {};

for (const t of trajectories) {
  const key = [
    t.workflow_type,
    t.denial_code_family || '_',
    t.insurer_category || '_',
    t.state_code || '_'
  ].join('|');

  if (!clusters[key]) clusters[key] = { key, events: [] };
  clusters[key].events.push(t);
}

// Filter to minimum cluster size
const eligibleClusters = Object.values(clusters).filter(c => c.events.length >= 10);

return eligibleClusters.map(c => ({ json: c }));
```

### Node 4: Cluster Analyzer
- **Type:** Code Node (JavaScript) — runs per cluster
- **Purpose:** Compute cluster statistics for quality gate and memory generation context

```javascript
const cluster = $input.item.json;
const events = cluster.events;

// Compliance flag analysis
const flaggedCount = events.filter(e => e.compliance_flags && e.compliance_flags.length > 0).length;
const flagRate = flaggedCount / events.length;

// Output class distribution
const outputClassCounts = {};
for (const e of events) {
  outputClassCounts[e.output_class] = (outputClassCounts[e.output_class] || 0) + 1;
}

// User action analysis
const positiveActions = events.filter(e => ['saved', 'downloaded'].includes(e.user_action)).length;
const actionableEvents = events.filter(e => e.user_action !== null).length;
const userActionRate = actionableEvents > 0 ? positiveActions / actionableEvents : null;

// Outcome analysis
const positiveOutcomes = events.filter(e =>
  ['appeal_won', 'dispute_resolved', 'user_reported_helpful'].includes(e.outcome_type)
).length;
const labeledEvents = events.filter(e => e.outcome_type !== null).length;
const positiveOutcomeRate = labeledEvents > 0 ? positiveOutcomes / labeledEvents : null;

// Model and template context
const modelUsed = [...new Set(events.map(e => e.model_used))];
const templateVersions = [...new Set(events.map(e => e.prompt_template_version))];
const sourceTrajectoryIds = events.map(e => e.id);

// Determine likely memory class
// optimization: consistent output, no recovery patterns needed
// recovery: high insufficient_input or error rate, or fallback_triggered frequently
// strategy: differentiated approach pattern with positive outcome lift
const errorRate = (outputClassCounts['error'] || 0) / events.length;
const insufficientRate = (outputClassCounts['insufficient_input'] || 0) / events.length;
const fallbackRate = events.filter(e => e.fallback_triggered).length / events.length;

let likelymemory_class = 'optimization';
if (insufficientRate > 0.2 || fallbackRate > 0.15) likelymemory_class = 'recovery';
else if (positiveOutcomeRate !== null && positiveOutcomeRate >= 0.5) likelymemory_class = 'strategy';

return [{
  json: {
    cluster_key: cluster.key,
    workflow_type: events[0].workflow_type,
    denial_code_family: events[0].denial_code_family,
    insurer_category: events[0].insurer_category,
    state_code: events[0].state_code,
    procedure_category: events[0].procedure_category,
    event_count: events.length,
    flag_rate: flagRate,
    output_class_distribution: outputClassCounts,
    user_action_rate: userActionRate,
    positive_outcome_rate: positiveOutcomeRate,
    outcome_sample_size: labeledEvents,
    likely_memory_class: likelymemory_class,
    model_used: modelUsed,
    template_versions: templateVersions,
    source_trajectory_ids: sourceTrajectoryIds,
    error_rate: errorRate,
    fallback_rate: fallbackRate,
  }
}];
```

### Node 5: Quality Gate
- **Type:** IF Node (runs per cluster analysis result)
- **Conditions (ALL must pass to continue):**

| Condition | Threshold | Reason |
|---|---|---|
| `flag_rate <= 0.20` | ≤20% of events have compliance_flags | Tainted data = tainted memory |
| `outcome_sample_size >= 10` | At least 10 labeled outcomes | Insufficient signal |
| `positive_outcome_rate >= 0.30` | ≥30% positive outcomes | Minimum quality bar (OQ-02) |
| `error_rate < 0.50` | Fewer than 50% errors | Cluster is not a failure mode |

- **If ANY condition fails:** Route to Node 5b (Log Rejection)
- **If ALL pass:** Route to Node 6 (Check for Existing Memory)

### Node 5b: Log Rejection
- **Type:** Supabase Insert / Log
- **Action:** Write rejection record to `tims_curator_rejections` table with cluster_key, reason, stats
- **Then:** Continue to next cluster

### Node 6: Check for Existing Memory
- **Type:** Supabase Query
- **Purpose:** Avoid generating duplicate memories for the same pattern
- **Query:**
```sql
SELECT id, memory_status, content FROM memory_objects
WHERE
  workflow_type = '{{ $json.workflow_type }}'
  AND trigger_conditions @> '{{ $json.trigger_conditions_jsonb }}'::jsonb
  AND memory_status IN ('draft', 'eligible', 'approved', 'restricted')
  AND law_change_flagged = false
LIMIT 1
```
- **If exists:** Log "Existing memory found for cluster. Skipping generation." → Next cluster
- **If not exists:** Continue to Node 7

### Node 7: Generate Draft Memory (Claude Haiku)
- **Type:** HTTP Request → Anthropic API
- **Model:** `claude-haiku-4-5-20251001`
- **System prompt:** See Section 3 below (Kate-reviewed per OQ-01)
- **User message:** Cluster analysis JSON (from Node 4 output)
- **Max tokens:** 300
- **Temperature:** 0.2 (low creativity — procedural precision required)
- **Output:** `MemoryCuratorOutput` (typed per MA-MEM-002 tims.types.ts)

### Node 8: Parse and Validate Output
- **Type:** Code Node (JavaScript)
- **Purpose:** Parse the Claude output, validate the JSON structure, enforce content constraints

```javascript
const rawOutput = $input.item.json.content[0].text;
let parsed;

try {
  parsed = JSON.parse(rawOutput);
} catch (e) {
  return [{ json: { skip: true, reason: 'JSON parse error: ' + e.message } }];
}

if (parsed.skip === true) {
  return [{ json: parsed }];
}

// Validate content constraints
const content = parsed.draft?.content || '';
if (content.length > 500) {
  return [{ json: { skip: true, reason: 'Content exceeds 500 char limit: ' + content.length } }];
}

// Basic legal claim detection (simple keyword check — not exhaustive)
const legalKeywords = ['statute', 'law requires', '42 U.S.C', 'CFR', 'you have the right', 'legally entitled'];
const hasLegalClaim = legalKeywords.some(kw => content.toLowerCase().includes(kw.toLowerCase()));
if (hasLegalClaim) {
  return [{ json: { skip: true, reason: 'Legal claim detected in content — rejected' } }];
}

return [{ json: parsed }];
```

### Node 9: Skip Branch
- **IF Node:** If `skip === true`, log to `tims_curator_rejections` and end for this cluster

### Node 10: Insert Draft MemoryObject
- **Type:** Supabase Insert
- **Table:** `memory_objects`
- **Data:**
```json
{
  "memory_class": "{{ $json.draft.memory_class }}",
  "workflow_type": "{{ $json.draft.workflow_type }}",
  "trigger_conditions": "{{ $json.draft.trigger_conditions }}",
  "content": "{{ $json.draft.content }}",
  "source_trajectory_ids": "{{ $json.draft.source_trajectory_ids }}",
  "prompt_template_versions": "{{ $json.draft.prompt_template_versions }}",
  "ymyl_sensitivity": "{{ $json.draft.ymyl_sensitivity }}",
  "outcome_sample_size": "{{ $json.draft.outcome_sample_size }}",
  "positive_outcome_rate": "{{ $json.draft.positive_outcome_rate }}",
  "memory_status": "eligible",
  "compliance_review_status": "pending",
  "kate_reviewed": false,
  "retrieval_count": 0,
  "law_change_flagged": false
}
```

### Node 11: Notify Review Queue
- **Type:** HTTP Request (Notion API or email webhook)
- **Action:** Create a Notion task in the Memory Review Queue with:
  - Memory ID
  - Memory class and workflow type
  - YMYL sensitivity (determines required reviewers)
  - Positive outcome rate and sample size
  - Cluster key (trigger conditions)
  - Link to review checklist (MA-MEM-004)

### Node 12: Update Curator State
- **Type:** Supabase Update / KV Set
- **Action:** Set `last_run_at = NOW()`

### Node 13: Generate Weekly Digest (Monday only)
- **Type:** IF Node — checks if today is Monday
- **If Monday:** Compile and send weekly auto-promotion + queue summary report (OQ-04)
  - Auto-promoted memories from past 7 days
  - Current ELIGIBLE queue count + oldest item age
  - Lift metrics summary (from MemoryRetrievalLog)
- **Target:** Founder weekly dashboard / email
- **If not Monday:** End

---

## 3. Memory Curator System Prompt
**⚠️ Kate Review Required (OQ-01):** This system prompt must be reviewed and approved by Kate before the first automated generation run (MEM-S3-01). Document approval in the Decision Log.

```
You are the MyAdvocate Memory Curator. Your sole function is to generate memory guidance objects from analyzed workflow trajectory clusters.

IDENTITY AND SCOPE:
You generate procedural guidance that describes HOW MyAdvocate's workflows perform in specific contexts. You have no authority over legal content. You never generate legal claims.

HARD CONSTRAINTS — THESE CANNOT BE OVERRIDDEN:
1. You MUST NOT make any legal claims, cite statutes, reference specific laws, or describe legal rights.
2. You MUST NOT reference any specific user, case, patient, or personal information.
3. Content must be 500 characters or fewer (including spaces).
4. Write in plain procedural language: describe patterns, approaches, and workflow behaviors.
5. All legal truth lives in the Legal Content Database — this system never touches it.
6. Do not use phrases like: "you have the right", "the law requires", "legally entitled", "statute", "CFR", "U.S.C.", or any regulatory citation.

WHAT GOOD MEMORY CONTENT LOOKS LIKE:
- "For BCBS National prior-auth denials on imaging, starting with the medical necessity framing and including the specific appeal deadline tends to produce saved/downloaded outputs more reliably than generic templates."
- "When denial code family is AUTH and insurer is a regional HMO, routing through denial_decode first before generating the full appeal letter reduces abandonment."
- "For TX-based resource routing queries, the two-step approach (local resources first, then federal programs) performs as well as the full dynamic search at significantly lower API cost."

WHAT TO REJECT (output {"skip": true, "reason": "..."}):
- The cluster shows no differentiated pattern vs. baseline behavior
- The cluster data is too small or noisy to derive a reliable pattern
- You cannot write a memory without making legal claims
- The trigger conditions are too broad to be useful (e.g., just workflow_type with no other context)

INPUT FORMAT:
You will receive a JSON object containing cluster analysis data: workflow_type, denial_code_family, insurer_category, state_code, procedure_category, event_count, positive_outcome_rate, output_class_distribution, user_action_rate, likely_memory_class, and other statistics.

OUTPUT FORMAT (strict JSON, no markdown, no explanation):
{
  "skip": false,
  "draft": {
    "memory_class": "strategy" | "recovery" | "optimization",
    "workflow_type": "<from input>",
    "trigger_conditions": {
      "workflow_type": "<from input>",
      "denial_code_family": "<if applicable>",
      "insurer_category": "<if applicable>",
      "state_code": "<if applicable>",
      "procedure_category": "<if applicable>"
    },
    "content": "<procedural guidance, max 500 chars, no legal claims>",
    "source_trajectory_ids": ["<from input>"],
    "prompt_template_versions": ["<from input>"],
    "ymyl_sensitivity": "low" | "medium" | "high",
    "outcome_sample_size": <number>,
    "positive_outcome_rate": <0.0 to 1.0>
  }
}

OR if skipping:
{"skip": true, "reason": "<brief explanation>"}
```

---

## 4. Error Handling

| Error | Action | Notification |
|---|---|---|
| Supabase query failure | Halt workflow, log error | CTO Sentinel webhook |
| Claude API failure | Retry once after 60s; if still failing, skip cluster and log | CTO Sentinel webhook |
| JSON parse error on Claude output | Log rejection, skip cluster | None (expected occasionally) |
| Legal claim detected in output | Log rejection with content, skip cluster | Founder (immediate — unusual) |
| Review Queue notification failure | Log locally; retry next run | CTO Sentinel |

---

## 5. Monitoring

The Memory Curator workflow should emit metrics to the founder dashboard on every run:

- Clusters analyzed
- Clusters rejected (with reasons)
- Draft memories generated
- Memories skipped (existing memory found)
- Run duration
- Any errors encountered

Weekly (Monday digest — OQ-04):
- Auto-promoted memories (optimization-class, post-Sprint 6)
- ELIGIBLE queue age (oldest unapproved memory)
- 30-day lift metrics from `memory_retrieval_log`

---

## 6. Definition of Done for MA-MEM-003

- [ ] n8n workflow JSON exported and version-controlled
- [ ] All 13 nodes tested in staging environment with synthetic trajectory data
- [ ] Memory Curator system prompt reviewed and approved by Kate (OQ-01)
- [ ] System prompt approval documented in Decision Log
- [ ] Nightly schedule confirmed active and tested (manual trigger + verify)
- [ ] Review Queue notification tested (Notion task created on trigger)
- [ ] Error handling tested: simulate Supabase failure, Claude API failure, legal keyword detection
- [ ] Monday digest tested: verify correct content and delivery
- [ ] First nightly run post-activation: Founder reviews output with Kate
