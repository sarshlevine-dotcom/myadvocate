import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'crypto'
import type { Langfuse } from 'langfuse'

// Import under test
import { trackedExecution, _resetLangfuseClient, _setLangfuseClientForTesting } from '@/lib/tracked-execution'

// ─── Mock Langfuse client ─────────────────────────────────────────────────────
// Inject a hand-rolled mock directly via _setLangfuseClientForTesting() to avoid
// vi.mock('langfuse') ESM/CJS interop issues with jsdom environment.

let mockTrace: ReturnType<typeof vi.fn>
let mockLangfuseClient: Langfuse

function freshMockClient() {
  mockTrace = vi.fn()
  mockLangfuseClient = { trace: mockTrace } as unknown as Langfuse
  _setLangfuseClientForTesting(mockLangfuseClient)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSuccessfulFn<T = string>(result: T = 'letter content' as unknown as T) {
  return vi.fn(async () => ({
    result,
    usage: { model: 'claude-haiku-4-5-20251001', inputTokens: 100, outputTokens: 50 },
  }))
}

const BASE_INPUT = {
  functionName: 'generateAppealLetter' as const,
  callSource:   'app'                  as const,
  piiScrubberConfirmed: true,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('trackedExecution', () => {
  beforeEach(() => {
    _resetLangfuseClient()
    freshMockClient()
  })

  // ── Test 1: Hard gate ───────────────────────────────────────────────────────

  it('throws PII_SCRUB_REQUIRED when piiScrubberConfirmed is false', async () => {
    const fn = makeSuccessfulFn()

    await expect(
      trackedExecution({ ...BASE_INPUT, piiScrubberConfirmed: false }, fn),
    ).rejects.toThrow('PII_SCRUB_REQUIRED')

    // fn must not have been called — gate fires before execution
    expect(fn).not.toHaveBeenCalled()
  })

  // ── Test 2: Successful execution emits correct trace fields ─────────────────

  it('emits correct trace fields to Langfuse on successful execution', async () => {
    const fn = makeSuccessfulFn('my letter')

    const { result, trace } = await trackedExecution(
      { ...BASE_INPUT, userId: 'hashed-user-id', sessionId: 'sess-123' },
      fn,
    )

    // Result passes through unchanged
    expect(result).toBe('my letter')

    // trace() was called once with correct fields
    expect(mockTrace).toHaveBeenCalledOnce()

    const emitted = mockTrace.mock.calls[0][0]

    // Required trace identity fields
    expect(emitted.name).toBe('generateAppealLetter')
    expect(emitted.userId).toBe('hashed-user-id')
    expect(emitted.sessionId).toBe('sess-123')
    expect(typeof emitted.id).toBe('string')
    expect(emitted.id).toMatch(/^[0-9a-f-]{36}$/)   // UUID v4 format

    // Metadata
    expect(emitted.metadata.callSource).toBe('app')
    expect(emitted.metadata.model).toBe('claude-haiku-4-5-20251001')
    expect(emitted.metadata.inputTokens).toBe(100)
    expect(emitted.metadata.outputTokens).toBe(50)
    expect(emitted.metadata.errorState).toBe(false)
    expect(emitted.metadata.errorCode).toBeNull()
    expect(emitted.metadata.piiScrubberConfirmed).toBe(true)
    expect(emitted.metadata.costUsd).toBeGreaterThan(0)
    expect(emitted.metadata.latencyMs).toBeGreaterThanOrEqual(0)

    // TraceOutput shape
    expect(trace.model).toBe('claude-haiku-4-5-20251001')
    expect(trace.inputTokens).toBe(100)
    expect(trace.outputTokens).toBe(50)
    expect(trace.errorState).toBe(false)
    expect(trace.traceId).toBe(emitted.id)
  })

  // ── Test 3: Langfuse failure does not throw ─────────────────────────────────

  it('delivers the letter normally when Langfuse throws', async () => {
    mockTrace.mockImplementation(() => { throw new Error('Langfuse network error') })

    const fn = makeSuccessfulFn('letter despite langfuse failure')

    // Must NOT throw — letter delivery takes priority
    const { result, trace } = await trackedExecution(BASE_INPUT, fn)

    expect(result).toBe('letter despite langfuse failure')
    expect(trace.errorState).toBe(false)   // the Anthropic call succeeded; Langfuse failure is not errorState
  })

  // ── Test 4: userId is hashed (SHA-256), never raw UUID ──────────────────────

  it('forwards a pre-hashed userId to Langfuse — not a raw UUID', async () => {
    const rawUuid      = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    const hashedUserId = createHash('sha256').update(rawUuid).digest('hex')

    // Caller (generate-letter.ts) hashes before calling trackedExecution.
    // This test verifies trackedExecution forwards the hash as-is and never
    // exposes the raw UUID to the trace layer.
    await trackedExecution({ ...BASE_INPUT, userId: hashedUserId }, makeSuccessfulFn())

    const emitted = mockTrace.mock.calls[0][0]

    // The hashed value must reach Langfuse unchanged
    expect(emitted.userId).toBe(hashedUserId)

    // Must NOT match the raw UUID
    expect(emitted.userId).not.toBe(rawUuid)

    // Must look like a SHA-256 hex digest (64 hex chars)
    expect(emitted.userId).toMatch(/^[0-9a-f]{64}$/)
  })
})
