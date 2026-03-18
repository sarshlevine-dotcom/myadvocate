/**
 * MA-ARC-FUNC-001 — Langfuse Trace Wrapper
 *
 * Wraps every Anthropic API call in a Langfuse trace so all letter-generation
 * executions are observable in one place across both app and n8n agent calls.
 *
 * LAUNCH BLOCKER: Must wrap all generateLetter() Anthropic API calls before
 * public traffic (MA-ARC-FUNC-001, MA-AUT-006 §G6).
 *
 * Rules:
 * - piiScrubberConfirmed MUST be true — hard gate, throws PII_SCRUB_REQUIRED
 * - Langfuse emit is non-blocking — failure must NEVER block letter delivery
 * - Import langfuse ONLY in this file — never elsewhere
 * - Lazy-init client — env vars read at call time, not module load time
 */

import { randomUUID } from 'crypto'
import { Langfuse } from 'langfuse'

// ─── Canonical function names ─────────────────────────────────────────────────
// 6 from the trace schema (MA-ARC-001) + 2 Phase 1 letter types not yet in schema doc.
export type CanonicalFunctionName =
  | 'generateAppealLetter'
  | 'generateDisputeLetter'
  | 'generateHIPAARequest'
  | 'generateNegotiationScript'
  | 'explainDenialCode'
  | 'getPatientRights'
  | 'routeComplaint'
  | 'generateBillingAnalysis'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TraceInput {
  functionName:        CanonicalFunctionName
  callSource:          'app' | 'agent'   // default: 'app'
  agentId?:            string | null     // required when callSource='agent'; null for app calls
  userId?:             string            // anonymized (SHA-256 hashed) — never raw Supabase UUID
  sessionId?:          string | null
  piiScrubberConfirmed: boolean          // HARD GATE — must be true
  qualityScore?:       number | null     // populated by LQE in future sprint; null for now
}

export interface TraceOutput {
  traceId:      string
  model:        string
  inputTokens:  number
  outputTokens: number
  costUsd:      number
  latencyMs:    number
  qualityScore: number | null
  errorState:   boolean
  errorCode?:   string
}

// ─── Cost rates (USD per token) ───────────────────────────────────────────────
// Haiku:  $0.80/$4.00 per MTok  (input/output)
// Sonnet: $3.00/$15.00 per MTok (input/output)
// Conservative fallback: Sonnet rates (never under-report cost)
const MODEL_COST_USD_PER_TOKEN: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.0000008,  output: 0.000004  },
  'claude-sonnet-4-6':         { input: 0.000003,   output: 0.000015  },
}
const FALLBACK_COST = { input: 0.000003, output: 0.000015 }

// ─── Lazy Langfuse singleton ──────────────────────────────────────────────────
// Mirrors getAnthropicClient() pattern: env vars read at first call, not import time.
let _langfuseClient: Langfuse | null = null

function getLangfuseClient(): Langfuse {
  if (!_langfuseClient) {
    // Top-level import is used (not require) so Vitest's vi.mock('langfuse') intercepts
    // correctly. The class is imported; new Langfuse() is lazy — called here on first use,
    // not at module load time. Missing env vars are safe: Langfuse warns but doesn't throw.
    _langfuseClient = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? '',
      secretKey: process.env.LANGFUSE_SECRET_KEY ?? '',
    })
  }
  return _langfuseClient
}

// ─── Test helpers (never call in production code) ─────────────────────────────
export function _resetLangfuseClient(): void {
  _langfuseClient = null
}

/** Inject a pre-built mock client in tests — avoids vi.mock ESM/CJS interop issues. */
export function _setLangfuseClientForTesting(client: Langfuse): void {
  _langfuseClient = client
}

// ─── trackedExecution ─────────────────────────────────────────────────────────

/**
 * Wraps an Anthropic API call with a Langfuse trace.
 *
 * @see docs/architecture/langfuse-trace-schema.md
 * @authority MA-ARC-FUNC-001 — launch blocker, all 6 canonical functions must be
 *   wrapped before any ships to production
 *
 * @param input  - Trace metadata. piiScrubberConfirmed MUST be true.
 * @param fn     - Async function that calls Anthropic and returns the result +
 *                 usage (model string, token counts in camelCase).
 *
 * @throws Error('PII_SCRUB_REQUIRED') if piiScrubberConfirmed is false.
 *         All other errors are re-thrown after the trace is emitted.
 */
export async function trackedExecution<T>(
  input: TraceInput,
  fn: () => Promise<{ result: T; usage: { model: string; inputTokens: number; outputTokens: number } }>,
): Promise<{ result: T; trace: TraceOutput }> {

  // ── Hard gate ────────────────────────────────────────────────────────────────
  if (!input.piiScrubberConfirmed) {
    throw new Error('PII_SCRUB_REQUIRED')
  }

  const traceId   = randomUUID()
  const startTime = Date.now()

  let errorState  = false
  let errorCode: string | undefined
  let latencyMs   = 0
  let model       = 'unknown'
  let inputTokens = 0
  let outputTokens = 0
  let costUsd      = 0

  let fnResult: { result: T; usage: { model: string; inputTokens: number; outputTokens: number } } | undefined

  try {
    fnResult = await fn()
  } catch (err: unknown) {
    errorState = true
    errorCode  = (err instanceof Error ? err.message : String(err)).slice(0, 64) || 'UNKNOWN'
    throw err
  } finally {
    latencyMs    = Date.now() - startTime
    model        = fnResult?.usage?.model        ?? 'unknown'
    inputTokens  = fnResult?.usage?.inputTokens  ?? 0
    outputTokens = fnResult?.usage?.outputTokens ?? 0
    const rates  = MODEL_COST_USD_PER_TOKEN[model] ?? FALLBACK_COST
    costUsd      = inputTokens * rates.input + outputTokens * rates.output

    // ── Non-blocking Langfuse emit ────────────────────────────────────────────
    // A Langfuse failure must NEVER block letter delivery — swallow all throws.
    try {
      getLangfuseClient().trace({
        id:        traceId,
        name:      input.functionName,
        userId:    input.userId,
        sessionId: input.sessionId ?? undefined,
        timestamp: new Date(startTime),
        metadata:  {
          callSource:           input.callSource,
          agentId:              input.agentId ?? null,
          model,
          inputTokens,
          outputTokens,
          costUsd,
          latencyMs,
          qualityScore:         input.qualityScore ?? null,
          errorState,
          errorCode:            errorCode ?? null,
          piiScrubberConfirmed: input.piiScrubberConfirmed,
          environment:          process.env.NODE_ENV ?? 'development',
        },
      })
    } catch {
      // Intentionally swallowed — Langfuse failure must never block delivery
    }
  }

  // fnResult is defined here — if fn() threw we re-threw above
  const trace: TraceOutput = {
    traceId,
    model,
    inputTokens,
    outputTokens,
    costUsd,
    latencyMs,
    qualityScore: input.qualityScore ?? null,
    errorState,
    errorCode,
  }

  return { result: fnResult!.result, trace }
}
