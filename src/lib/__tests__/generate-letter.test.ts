/**
 * Tests for generateLetter() gate chain — Gates 1–3
 * MA-AUT-006 §G6
 *
 * Mocks all external I/O (Anthropic, Supabase, Langfuse) so no real API calls
 * are made. Each test suite exercises one gate in isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LetterType } from '@/lib/generate-letter'

// ─── Mock setup ───────────────────────────────────────────────────────────────
// vi.hoisted() ensures these are defined before the vi.mock() factory closures
// execute, which happen at module evaluation time (before the test body runs).

const mockMessagesCreate   = vi.hoisted(() => vi.fn())
const mockTrackedExecution = vi.hoisted(() => vi.fn())
const mockScrubPII         = vi.hoisted(() => vi.fn())
const mockCreateArtifact   = vi.hoisted(() => vi.fn())
const mockAddToReviewQueue = vi.hoisted(() => vi.fn())
const mockLogEvent         = vi.hoisted(() => vi.fn())
const mockRecordApiSpend   = vi.hoisted(() => vi.fn())

// Must use a regular function (not arrow) for `new Anthropic(...)` to work —
// arrow functions cannot be used as constructors.
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockMessagesCreate } }
  }),
}))

vi.mock('@/lib/pii-scrubber',     () => ({ scrubPII: mockScrubPII }))
vi.mock('@/lib/tracked-execution', () => ({ trackedExecution: mockTrackedExecution }))
vi.mock('@/lib/db/artifacts',     () => ({ createArtifact: mockCreateArtifact }))
vi.mock('@/lib/db/review-queue',  () => ({ addToReviewQueue: mockAddToReviewQueue }))
vi.mock('@/lib/db/metric-events', () => ({ logEvent: mockLogEvent }))
vi.mock('@/lib/budget-monitor',   () => ({ recordApiSpend: mockRecordApiSpend }))

// Import under test — after mocks so vi.mock hoisting intercepts correctly
import { generateLetter } from '@/lib/generate-letter'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const BASE_PARAMS = {
  caseId:     'case-001',
  userId:     'user-001',
  letterType: 'denial_appeal' as LetterType,
  caseData:   { denialCode: 'CO-4', insurerType: 'commercial', state: 'CA' },
}

// Makes trackedExecution actually call `fn` so the Anthropic mock receives the prompt.
// Returns a minimal TraceOutput so the rest of generateLetter() can proceed.
function makePassthroughTrackedExecution() {
  mockTrackedExecution.mockImplementation(
    async (
      _input: unknown,
      fn: () => Promise<{ result: unknown; usage: { model: string; inputTokens: number; outputTokens: number } }>,
    ) => {
      const { result, usage } = await fn()
      return {
        result,
        trace: {
          traceId:      'test-trace-id',
          model:        usage.model,
          inputTokens:  usage.inputTokens,
          outputTokens: usage.outputTokens,
          costUsd:      0.001,
          latencyMs:    50,
          qualityScore: null,
          errorState:   false,
        },
      }
    },
  )
}

// Standard Anthropic response mock for happy-path tests.
function mockAnthropicSuccess() {
  mockMessagesCreate.mockResolvedValue({
    content: [{ type: 'text', text: 'Generated appeal letter content.' }],
    usage:   { input_tokens: 100, output_tokens: 50 },
    model:   'claude-haiku-4-5-20251001',
  })
}

// Standard DB + telemetry mocks for happy-path tests.
function mockAllDepsSuccess() {
  mockCreateArtifact.mockResolvedValue({
    id:                 'artifact-001',
    case_id:            'case-001',
    artifact_type:      'denial_appeal',
    release_state:      'review_required',
    content_hash:       'abc123',
    storage_path:       'artifacts/case-001/abc123.txt',
    disclaimer_version: '1.0.0',
    created_at:         '2026-03-18T00:00:00.000Z',
  })
  mockAddToReviewQueue.mockResolvedValue(undefined)
  mockLogEvent.mockResolvedValue(undefined)
  mockRecordApiSpend.mockResolvedValue(undefined)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateLetter() — Gate 1: Input Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // logEvent is called with .catch(() => {}) — must return a Promise, not undefined
    mockLogEvent.mockResolvedValue(undefined)
    mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
  })

  it('throws GATE_1_FAILED when caseId is missing', async () => {
    const params = { ...BASE_PARAMS, caseId: '' }

    await expect(generateLetter(params)).rejects.toThrow(
      'GATE_1_FAILED: missing required fields: caseId',
    )
    // trackedExecution (and thus the API) must not have been called
    expect(mockTrackedExecution).not.toHaveBeenCalled()
  })

  it('throws GATE_1_FAILED when userId is missing', async () => {
    const params = { ...BASE_PARAMS, userId: '' }

    await expect(generateLetter(params)).rejects.toThrow(
      'GATE_1_FAILED: missing required fields: userId',
    )
    expect(mockTrackedExecution).not.toHaveBeenCalled()
  })

  it('throws GATE_1_FAILED when letterType is invalid', async () => {
    const params = { ...BASE_PARAMS, letterType: 'unknown_type' as LetterType }

    await expect(generateLetter(params)).rejects.toThrow('GATE_1_FAILED: invalid letterType')
    expect(mockTrackedExecution).not.toHaveBeenCalled()
  })

  it('logs gate_failure event when Gate 1 fails on missing field', async () => {
    const params = { ...BASE_PARAMS, caseId: '' }

    await generateLetter(params).catch(() => {})

    const gateFailureCalls = mockLogEvent.mock.calls.filter(
      (call) => call[0].eventType === 'gate_failure',
    )
    expect(gateFailureCalls.length).toBeGreaterThan(0)
  })

  it('does not throw when all required fields are present and letterType is valid', async () => {
    makePassthroughTrackedExecution()
    mockAnthropicSuccess()
    mockAllDepsSuccess()

    await expect(generateLetter(BASE_PARAMS)).resolves.toBeDefined()
  })
})

describe('generateLetter() — Gate 2: PII Scrub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogEvent.mockResolvedValue(undefined)
  })

  it('throws GATE_2_FAILED when scrubPII throws', async () => {
    mockScrubPII.mockImplementation(() => {
      throw new Error('unexpected input type')
    })

    await expect(generateLetter(BASE_PARAMS)).rejects.toThrow('GATE_2_FAILED: PII_SCRUB_ERROR')

    // API must not have been called
    expect(mockTrackedExecution).not.toHaveBeenCalled()
  })

  it('logs gate_failure when Gate 2 fails', async () => {
    mockScrubPII.mockImplementation(() => {
      throw new Error('scrubPII internal error')
    })

    await generateLetter(BASE_PARAMS).catch(() => {})

    const gateFailureCalls = mockLogEvent.mock.calls.filter(
      (call) => call[0].eventType === 'gate_failure',
    )
    expect(gateFailureCalls.length).toBeGreaterThan(0)
  })
})

describe('generateLetter() — Gate 3: Context Firewall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // scrubPII passthrough — Gate 3 tests focus on the firewall, not PII removal
    mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
    makePassthroughTrackedExecution()
    mockAnthropicSuccess()
    mockAllDepsSuccess()
  })

  it('strips a non-whitelisted field before it reaches the Anthropic prompt', async () => {
    const paramsWithExtraField = {
      ...BASE_PARAMS,
      caseData: {
        denialCode:    'CO-4',       // whitelisted for denial_appeal
        insurerType:   'commercial', // whitelisted for denial_appeal
        state:         'CA',         // whitelisted for denial_appeal
        INTERNAL_FLAG: 'secret',     // NOT whitelisted — must be stripped
      },
    }

    await generateLetter(paramsWithExtraField)

    // The prompt is built inside the fn() closure passed to trackedExecution.
    // Since mockTrackedExecution calls fn(), mockMessagesCreate receives the real prompt.
    expect(mockMessagesCreate).toHaveBeenCalledOnce()
    const promptContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string

    // Whitelisted fields must appear in the prompt
    expect(promptContent).toContain('CO-4')
    expect(promptContent).toContain('commercial')
    expect(promptContent).toContain('CA')

    // Non-whitelisted field must NOT appear in the prompt
    expect(promptContent).not.toContain('INTERNAL_FLAG')
    expect(promptContent).not.toContain('secret')
  })

  it('passes all whitelisted fields through to the prompt unchanged', async () => {
    const paramsAllWhitelisted = {
      ...BASE_PARAMS,
      caseData: {
        denialCode:   'CO-16',
        insurerType:  'medicare_advantage',
        state:        'TX',
        denialDate:   '2026-03-01',
        planType:     'HMO',
        serviceType:  'imaging',
        denialReason: 'not medically necessary',
      },
    }

    await generateLetter(paramsAllWhitelisted)

    expect(mockMessagesCreate).toHaveBeenCalledOnce()
    const promptContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string

    expect(promptContent).toContain('CO-16')
    expect(promptContent).toContain('medicare_advantage')
    expect(promptContent).toContain('TX')
    expect(promptContent).toContain('2026-03-01')
    expect(promptContent).toContain('HMO')
    expect(promptContent).toContain('imaging')
    expect(promptContent).toContain('not medically necessary')
  })

  it('logs gate_failure when non-whitelisted fields are stripped', async () => {
    const paramsWithExtraField = {
      ...BASE_PARAMS,
      caseData: {
        denialCode: 'CO-4',
        LEAKED_KEY: 'should-not-reach-prompt',
      },
    }

    await generateLetter(paramsWithExtraField)

    const gateFailureCalls = mockLogEvent.mock.calls.filter(
      (call) => call[0].eventType === 'gate_failure',
    )
    expect(gateFailureCalls.length).toBeGreaterThan(0)
  })

  it('does not log gate_failure when all fields are whitelisted', async () => {
    await generateLetter(BASE_PARAMS) // caseData has only whitelisted keys

    const gateFailureCalls = mockLogEvent.mock.calls.filter(
      (call) => call[0].eventType === 'gate_failure',
    )
    // No non-whitelisted fields → no gate_failure log from Gate 3
    expect(gateFailureCalls.length).toBe(0)
  })

  it('does NOT throw when non-whitelisted fields are present (strip only, never halt)', async () => {
    const paramsWithExtraField = {
      ...BASE_PARAMS,
      caseData: {
        denialCode: 'CO-4',
        EXTRA_KEY:  'extra-value',
      },
    }

    // Gate 3 is non-halting — must not throw
    await expect(generateLetter(paramsWithExtraField)).resolves.toBeDefined()
  })
})
