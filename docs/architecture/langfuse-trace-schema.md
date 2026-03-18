# Langfuse Trace Schema — MyAdvocate

**Version:** 1.0
**Authority:** MA-ARC-001
**Applies to:** All trackedExecution() calls AND all n8n workflows that call canonical functions

This is the unified trace schema. Both trackedExecution() (direct Claude API calls from the app) and n8n workflow canonical function calls emit traces in this format. This gives a single observability view across the full stack — user-facing calls and agent-driven calls in the same Langfuse project.

---

## Trace Fields

| Field | Type | Required | Source | Description |
|---|---|---|---|---|
| `traceId` | string (UUID v4) | YES | Generated at call entry | Unique identifier for this execution |
| `functionName` | string | YES | Caller | One of the 6 canonical function names |
| `callSource` | enum | YES | Caller | `"app"` (user-facing) or `"agent"` (n8n workflow) |
| `agentId` | string \| null | YES if callSource=agent | n8n workflow | Agent ID (e.g., `"CTO-01"`, `"cancel-flow"`) — null for app calls |
| `model` | string | YES | API response | Model used (e.g., `"claude-sonnet-4-20250514"`) |
| `inputTokens` | number | YES | API response | Prompt tokens consumed |
| `outputTokens` | number | YES | API response | Completion tokens consumed |
| `costUsd` | number | YES | Calculated | `(inputTokens × input_rate) + (outputTokens × output_rate)` |
| `latencyMs` | number | YES | Timer | Wall-clock time from call entry to response received |
| `qualityScore` | number \| null | Conditional | Evaluation step | 0–100. Required for all user-facing calls. Null for agent utility calls. |
| `errorState` | boolean | YES | Try/catch | true if the call threw or returned an error response |
| `errorCode` | string \| null | If errorState=true | Error handler | Short error code (e.g., `"TIMEOUT"`, `"RATE_LIMIT"`, `"PII_SCRUB_FAILED"`) |
| `userId` | string (anonymized) | YES for app calls | Auth layer | Hashed user ID — NEVER raw UUID from Supabase auth |
| `sessionId` | string \| null | Optional | Session context | Groups multiple calls in a single user session |
| `timestamp` | string (ISO 8601 UTC) | YES | Generated at call entry | `"2025-01-15T14:23:01.000Z"` |
| `environment` | enum | YES | Build config | `"production"`, `"staging"`, `"development"` |
| `piiScrubberConfirmed` | boolean | YES | PII scrubber | Must be `true`. If `false`: block the call and log as errorState=true |

---

## trackedExecution() Implementation

```typescript
// src/lib/agents/trackedExecution.ts

import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
});

interface TraceInput {
  functionName: 'generateAppealLetter' | 'generateDisputeLetter' | 'explainDenialCode' | 'getPatientRights' | 'routeComplaint' | 'generateBillingAnalysis';
  callSource: 'app' | 'agent';
  agentId?: string;
  userId?: string; // anonymized (hashed)
  sessionId?: string;
  piiScrubberConfirmed: boolean;
}

interface TraceOutput {
  traceId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  qualityScore?: number;
  errorState: boolean;
  errorCode?: string;
}

export async function trackedExecution<T>(
  input: TraceInput,
  fn: () => Promise<{ result: T; usage: { model: string; inputTokens: number; outputTokens: number } }>
): Promise<{ result: T; trace: TraceOutput }> {

  // Hard gate: PII scrubber must have run
  if (!input.piiScrubberConfirmed) {
    throw new Error('PII_SCRUB_REQUIRED: trackedExecution() called without PII scrubber confirmation');
  }

  const traceId = crypto.randomUUID();
  const startTime = Date.now();
  let errorState = false;
  let errorCode: string | undefined;
  let apiResult: { result: T; usage: { model: string; inputTokens: number; outputTokens: number } };

  try {
    apiResult = await fn();
  } catch (err: any) {
    errorState = true;
    errorCode = err?.code || err?.message?.slice(0, 32) || 'UNKNOWN';
    throw err;
  } finally {
    const latencyMs = Date.now() - startTime;

    // Cost calculation (update rates if model pricing changes)
    const INPUT_RATE_PER_TOKEN = 0.000003;   // $3/MTok for claude-sonnet-4
    const OUTPUT_RATE_PER_TOKEN = 0.000015;  // $15/MTok for claude-sonnet-4
    const inputTokens = apiResult?.usage?.inputTokens ?? 0;
    const outputTokens = apiResult?.usage?.outputTokens ?? 0;
    const costUsd = (inputTokens * INPUT_RATE_PER_TOKEN) + (outputTokens * OUTPUT_RATE_PER_TOKEN);

    // Emit to Langfuse
    langfuse.trace({
      id: traceId,
      name: input.functionName,
      metadata: {
        callSource: input.callSource,
        agentId: input.agentId ?? null,
        model: apiResult?.usage?.model ?? 'unknown',
        inputTokens,
        outputTokens,
        costUsd,
        latencyMs,
        errorState,
        errorCode: errorCode ?? null,
        piiScrubberConfirmed: input.piiScrubberConfirmed,
        environment: process.env.NODE_ENV ?? 'development',
      },
      userId: input.userId,
      sessionId: input.sessionId,
    });
  }

  const trace: TraceOutput = {
    traceId,
    model: apiResult!.usage.model,
    inputTokens: apiResult!.usage.inputTokens,
    outputTokens: apiResult!.usage.outputTokens,
    costUsd: (apiResult!.usage.inputTokens * 0.000003) + (apiResult!.usage.outputTokens * 0.000015),
    latencyMs: Date.now() - startTime,
    errorState,
    errorCode,
  };

  return { result: apiResult!.result, trace };
}
```

---

## n8n Workflow Langfuse Integration

For n8n workflows that call canonical functions, use the **HTTP Request node** to emit traces directly to the Langfuse API rather than going through trackedExecution().

### n8n Langfuse Emit Node (HTTP Request)

```json
{
  "method": "POST",
  "url": "https://cloud.langfuse.com/api/public/traces",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "headers": {
    "Authorization": "Basic {{ Buffer.from(process.env.LANGFUSE_PUBLIC_KEY + ':' + process.env.LANGFUSE_SECRET_KEY).toString('base64') }}"
  },
  "body": {
    "id": "{{ $json.traceId }}",
    "name": "{{ $json.functionName }}",
    "metadata": {
      "callSource": "agent",
      "agentId": "{{ $json.agentId }}",
      "model": "{{ $json.model }}",
      "inputTokens": "{{ $json.inputTokens }}",
      "outputTokens": "{{ $json.outputTokens }}",
      "costUsd": "{{ $json.costUsd }}",
      "latencyMs": "{{ $json.latencyMs }}",
      "errorState": "{{ $json.errorState }}",
      "errorCode": "{{ $json.errorCode }}",
      "piiScrubberConfirmed": true,
      "environment": "production"
    }
  }
}
```

### n8n Workflow Pattern with Langfuse

```
[Trigger]
  → [Transform + PII Strip]
  → [Set: traceId = UUID, startTime = now()]
  → [Claude API call (via HTTP Request or @n8n/n8n-nodes-langchain)]
  → [Set: latencyMs = now() - startTime, tokenCounts from response]
  → [Decision: success or error?]
  → [Action: primary output]
  → [Log: Langfuse HTTP emit + Google Sheets Agent Status push]
```

---

## Unified Observability View

With this schema, Langfuse shows a single trace feed across both call sources:

| Filter | What You See |
|---|---|
| `callSource = "app"` | All user-facing canonical function calls |
| `callSource = "agent"` | All n8n agent canonical function calls |
| `errorState = true` | All failures, regardless of source |
| `functionName = "generateAppealLetter"` | Every appeal letter generated, app + agent |
| `agentId = "cancel-flow"` | All calls made by the Cancel Flow agent |

**Target quality score thresholds (from §6O in PMP):**
- generateAppealLetter(): ≥ 80/100
- generateDisputeLetter(): ≥ 80/100
- explainDenialCode(): ≥ 85/100
- getPatientRights(): ≥ 90/100
- routeComplaint(): ≥ 75/100
- generateBillingAnalysis(): ≥ 75/100

Scores below threshold trigger a Langfuse alert → CTO Sentinel flag → Google Sheets Agent Status WARN entry.
