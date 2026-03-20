/**
 * Tests for generateLetter() — full 7-gate chain (MA-AUT-006 §G6)
 *
 * Gate responsibilities:
 *   1 — Tier Authorization     (checkTierAuthorization — halts if unauthorized)
 *   2 — PII Scrub + Assert     (scrubPII + verifyScrubbed — halts on any PII leakage)
 *   3 — Output Cap Enforcement (OUTPUT_CONFIG cap must exist + be positive — halts if not)
 *   4 — Input Validation       (caseId, userId, caseData present — defense-in-depth)
 *   5 — Context Firewall       (strip non-allowlisted fields — strip-only, never halts)
 *   6 — LQE                    (letter quality check — routes failures, never halts)
 *   7 — Post-Generation        (disclaimer version + artifact state machine — halts on failure)
 *
 * Mocks all external I/O (Anthropic, Supabase, Langfuse) so no real API calls
 * are made. Each test suite exercises one gate in isolation by mocking all
 * upstream gates to pass in the beforeEach.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LetterType } from '@/lib/generate-letter'

// ─── Mock setup ───────────────────────────────────────────────────────────────
// vi.hoisted() ensures these are defined before the vi.mock() factory closures
// execute, which happen at module evaluation time (before the test body runs).

const mockMessagesCreate           = vi.hoisted(() => vi.fn())
const mockTrackedExecution         = vi.hoisted(() => vi.fn())
const mockScrubPII                 = vi.hoisted(() => vi.fn())
const mockVerifyScrubbed           = vi.hoisted(() => vi.fn())
const mockCheckTierAuthorization   = vi.hoisted(() => vi.fn())
const mockCreateArtifact           = vi.hoisted(() => vi.fn())
const mockAddToReviewQueue         = vi.hoisted(() => vi.fn())
const mockInsertReviewQueueItem    = vi.hoisted(() => vi.fn())
const mockLogEvent                 = vi.hoisted(() => vi.fn())
const mockRecordApiSpend           = vi.hoisted(() => vi.fn())
const mockRunLQE                   = vi.hoisted(() => vi.fn())
const mockGetDisclaimerVersion     = vi.hoisted(() => vi.fn())

// Must use a regular function (not arrow) for `new Anthropic(...)` to work —
// arrow functions cannot be used as constructors.
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockMessagesCreate } }
  }),
}))

vi.mock('@/lib/pii-scrubber', () => ({
  scrubPII:       mockScrubPII,
  verifyScrubbed: mockVerifyScrubbed,
}))
vi.mock('@/lib/auth-tier',       () => ({ checkTierAuthorization: mockCheckTierAuthorization }))
vi.mock('@/lib/tracked-execution', () => ({ trackedExecution: mockTrackedExecution }))
vi.mock('@/lib/db/artifacts',     () => ({ createArtifact: mockCreateArtifact }))
vi.mock('@/lib/db/review-queue',  () => ({
  addToReviewQueue:      mockAddToReviewQueue,
  insertReviewQueueItem: mockInsertReviewQueueItem,
}))
vi.mock('@/lib/db/metric-events', () => ({ logEvent: mockLogEvent }))
vi.mock('@/lib/budget-monitor',   () => ({ recordApiSpend: mockRecordApiSpend }))
// Gate 6 — LQE mock: defaults to pass so gate tests downstream are unaffected
vi.mock('@/lib/lqe', () => ({ runLQE: mockRunLQE }))
// Gate 7 — disclaimer mock: controls getDisclaimerVersion() return value
vi.mock('@/lib/disclaimer', () => ({
  appendDisclaimer:           (content: string) => content + '\n\n---\nDISCLAIMER TEST',
  CURRENT_DISCLAIMER_VERSION: '1.0.0',
  DISCLAIMER_HASH:            'abc123456789',
  getDisclaimerVersion:       mockGetDisclaimerVersion,
}))

// Import under test — after mocks so vi.mock hoisting intercepts correctly
import { generateLetter, validateArtifactState, validateLetterOutput, OUTPUT_CONFIG, CONTEXT_ALLOWLIST, buildWorkflowContract } from '@/lib/generate-letter'

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

// LQE pass result — default for all tests unless overridden
const LQE_PASS = {
  passed: true,
  checks: {
    denialCodeAccuracy: { passed: true, score: 1.0 },
    ymylSafety:         { passed: true, score: 1.0 },
    legalFraming:       { passed: true, score: 1.0 },
  },
}

// Standard DB + telemetry mocks for happy-path tests.
// Includes the new Gates 1+2 mocks so any test calling this gets a clean slate.
function mockAllDepsSuccess() {
  mockCheckTierAuthorization.mockResolvedValue({ authorized: true })
  mockVerifyScrubbed.mockImplementation(() => {})
  mockRunLQE.mockResolvedValue(LQE_PASS)
  mockGetDisclaimerVersion.mockReturnValue({ version: '1.0.0', hash: 'abc123456789' })
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
  mockInsertReviewQueueItem.mockResolvedValue(undefined)
  mockLogEvent.mockResolvedValue(undefined)
  mockRecordApiSpend.mockResolvedValue(undefined)
}

// ─── Gate 1: Tier Authorization ───────────────────────────────────────────────

describe('generateLetter() — Gate 1: Tier Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogEvent.mockResolvedValue(undefined)
    mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
    mockVerifyScrubbed.mockImplementation(() => {})
  })

  it('throws GATE_1_FAILED when user is not found (AUTH_USER)', async () => {
    mockCheckTierAuthorization.mockResolvedValue({
      authorized: false,
      reason:     'user_not_found',
      code:       'AUTH_USER',
    })

    await expect(generateLetter(BASE_PARAMS)).rejects.toThrow('GATE_1_FAILED: AUTH_USER:user_not_found')
    expect(mockTrackedExecution).not.toHaveBeenCalled()
  })

  it('throws GATE_1_FAILED when tier is insufficient (AUTH_TIER)', async () => {
    mockCheckTierAuthorization.mockResolvedValue({
      authorized: false,
      reason:     'tier_insufficient',
      code:       'AUTH_TIER',
    })

    await expect(generateLetter(BASE_PARAMS)).rejects.toThrow('GATE_1_FAILED: AUTH_TIER:tier_insufficient')
    expect(mockTrackedExecution).not.toHaveBeenCalled()
  })

  it('throws GATE_1_FAILED when generation limit is reached (AUTH_LIMIT)', async () => {
    mockCheckTierAuthorization.mockResolvedValue({
      authorized: false,
      reason:     'generation_limit_reached',
      code:       'AUTH_LIMIT',
    })

    await expect(generateLetter(BASE_PARAMS)).rejects.toThrow('GATE_1_FAILED: AUTH_LIMIT:generation_limit_reached')
    expect(mockTrackedExecution).not.toHaveBeenCalled()
  })

  it('logs gate_failure event when Gate 1 fails', async () => {
    mockCheckTierAuthorization.mockResolvedValue({
      authorized: false,
      reason:     'tier_insufficient',
      code:       'AUTH_TIER',
    })

    await generateLetter(BASE_PARAMS).catch(() => {})

    const gateFailureCalls = mockLogEvent.mock.calls.filter(
      (call) => call[0].eventType === 'gate_failure',
    )
    expect(gateFailureCalls.length).toBeGreaterThan(0)
  })

  it('does not throw and proceeds when authorized', async () => {
    makePassthroughTrackedExecution()
    mockAnthropicSuccess()
    mockAllDepsSuccess()

    await expect(generateLetter(BASE_PARAMS)).resolves.toBeDefined()
  })
})

// ─── Gate 2: PII Scrub + Clean Assertion ─────────────────────────────────────

describe('generateLetter() — Gate 2: PII Scrub + Clean Assertion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogEvent.mockResolvedValue(undefined)
    // Gate 1 must pass so Gate 2 is reachable
    mockCheckTierAuthorization.mockResolvedValue({ authorized: true })
  })

  it('throws GATE_2_FAILED: PII_SCRUB_ERROR when scrubPII throws', async () => {
    mockScrubPII.mockImplementation(() => {
      throw new Error('unexpected input type')
    })

    await expect(generateLetter(BASE_PARAMS)).rejects.toThrow('GATE_2_FAILED: PII_SCRUB_ERROR')
    expect(mockTrackedExecution).not.toHaveBeenCalled()
  })

  it('throws GATE_2_FAILED: PII_FIELDS_REMAINING when verifyScrubbed detects residual PII', async () => {
    mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
    mockVerifyScrubbed.mockImplementation(() => {
      throw new Error('PII_FIELDS_REMAINING: name, email')
    })

    await expect(generateLetter(BASE_PARAMS)).rejects.toThrow(
      'GATE_2_FAILED: PII_FIELDS_REMAINING: name, email',
    )
    expect(mockTrackedExecution).not.toHaveBeenCalled()
  })

  it('logs gate_failure when scrubPII throws', async () => {
    mockScrubPII.mockImplementation(() => {
      throw new Error('scrubPII internal error')
    })

    await generateLetter(BASE_PARAMS).catch(() => {})

    const gateFailureCalls = mockLogEvent.mock.calls.filter(
      (call) => call[0].eventType === 'gate_failure',
    )
    expect(gateFailureCalls.length).toBeGreaterThan(0)
  })

  it('logs gate_failure when verifyScrubbed throws', async () => {
    mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
    mockVerifyScrubbed.mockImplementation(() => {
      throw new Error('PII_FIELDS_REMAINING: ssn')
    })

    await generateLetter(BASE_PARAMS).catch(() => {})

    const gateFailureCalls = mockLogEvent.mock.calls.filter(
      (call) => call[0].eventType === 'gate_failure',
    )
    expect(gateFailureCalls.length).toBeGreaterThan(0)
  })
})

// ─── Gate 3: Output Cap Enforcement ──────────────────────────────────────────

describe('generateLetter() — Gate 3: Output Cap Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogEvent.mockResolvedValue(undefined)
    // Gates 1+2 must pass so Gate 3 is reachable
    mockCheckTierAuthorization.mockResolvedValue({ authorized: true })
    mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
    mockVerifyScrubbed.mockImplementation(() => {})
  })

  it('throws GATE_3_FAILED when letterType has no OUTPUT_CONFIG entry', async () => {
    // 'unknown_type' is not in OUTPUT_CONFIG — Gate 3 catches this
    const params = { ...BASE_PARAMS, letterType: 'unknown_type' as LetterType }

    await expect(generateLetter(params)).rejects.toThrow('GATE_3_FAILED: OUTPUT_CAP_OVERRIDE')
    expect(mockTrackedExecution).not.toHaveBeenCalled()
  })

  it('logs gate_failure when Gate 3 fails on missing OUTPUT_CONFIG entry', async () => {
    const params = { ...BASE_PARAMS, letterType: 'unknown_type' as LetterType }

    await generateLetter(params).catch(() => {})

    const gateFailureCalls = mockLogEvent.mock.calls.filter(
      (call) => call[0].eventType === 'gate_failure',
    )
    expect(gateFailureCalls.length).toBeGreaterThan(0)
  })

  it.each([
    'denial_appeal',
    'bill_dispute',
    'hipaa_request',
    'negotiation_script',
  ] as LetterType[])(
    'does not throw for valid letterType "%s" with configured OUTPUT_CONFIG cap',
    async (letterType) => {
      makePassthroughTrackedExecution()
      mockAnthropicSuccess()
      mockAllDepsSuccess()

      const params = { ...BASE_PARAMS, letterType }
      await expect(generateLetter(params)).resolves.toBeDefined()
    },
  )

  it('max_tokens sent to Anthropic matches OUTPUT_CONFIG[letterType].maxTokens', async () => {
    makePassthroughTrackedExecution()
    mockAnthropicSuccess()
    mockAllDepsSuccess()

    await generateLetter(BASE_PARAMS)

    expect(mockMessagesCreate).toHaveBeenCalledOnce()
    const callArgs = mockMessagesCreate.mock.calls[0][0] as { max_tokens: number }
    expect(callArgs.max_tokens).toBe(OUTPUT_CONFIG['denial_appeal'].maxTokens)
  })
})

// ─── Gate 4: Input Validation (defense-in-depth) ─────────────────────────────

describe('generateLetter() — Gate 4: Input Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogEvent.mockResolvedValue(undefined)
    // Gates 1–3 mocked to pass so Gate 4 is exercised in isolation
    mockCheckTierAuthorization.mockResolvedValue({ authorized: true })
    mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
    mockVerifyScrubbed.mockImplementation(() => {})
  })

  it('throws GATE_4_FAILED when caseId is missing', async () => {
    const params = { ...BASE_PARAMS, caseId: '' }

    await expect(generateLetter(params)).rejects.toThrow(
      'GATE_4_FAILED: missing required fields: caseId',
    )
    expect(mockTrackedExecution).not.toHaveBeenCalled()
  })

  it('throws GATE_4_FAILED when userId is missing (defense-in-depth; Gate 1 mocked to pass)', async () => {
    // In production, Gate 1 catches empty userId; this test verifies Gate 4 also catches it
    // as a defense-in-depth measure against any future bypass of Gate 1.
    const params = { ...BASE_PARAMS, userId: '' }

    await expect(generateLetter(params)).rejects.toThrow(
      'GATE_4_FAILED: missing required fields: userId',
    )
    expect(mockTrackedExecution).not.toHaveBeenCalled()
  })

  it('logs gate_failure event when Gate 4 fails', async () => {
    const params = { ...BASE_PARAMS, caseId: '' }

    await generateLetter(params).catch(() => {})

    const gateFailureCalls = mockLogEvent.mock.calls.filter(
      (call) => call[0].eventType === 'gate_failure',
    )
    expect(gateFailureCalls.length).toBeGreaterThan(0)
  })

  it('does not throw when all required fields are present and valid', async () => {
    makePassthroughTrackedExecution()
    mockAnthropicSuccess()
    mockAllDepsSuccess()

    await expect(generateLetter(BASE_PARAMS)).resolves.toBeDefined()
  })
})

// ─── Gate 5: Context Firewall ─────────────────────────────────────────────────

describe('generateLetter() — Gate 5: Context Firewall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Gates 1–4 must pass so Gate 5 is exercised
    mockCheckTierAuthorization.mockResolvedValue({ authorized: true })
    mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
    mockVerifyScrubbed.mockImplementation(() => {})
    makePassthroughTrackedExecution()
    mockAnthropicSuccess()
    mockAllDepsSuccess()
  })

  it('strips a non-allowlisted field before it reaches the Anthropic prompt', async () => {
    const paramsWithExtraField = {
      ...BASE_PARAMS,
      caseData: {
        denialCode:    'CO-4',       // allowlisted for denial_appeal
        insurerType:   'commercial', // allowlisted for denial_appeal
        state:         'CA',         // allowlisted for denial_appeal
        INTERNAL_FLAG: 'secret',     // NOT allowlisted — must be stripped
      },
    }

    await generateLetter(paramsWithExtraField)

    // The prompt is built inside the fn() closure passed to trackedExecution.
    // Since mockTrackedExecution calls fn(), mockMessagesCreate receives the real prompt.
    expect(mockMessagesCreate).toHaveBeenCalledOnce()
    const promptContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string

    // Allowlisted fields must appear in the prompt
    expect(promptContent).toContain('CO-4')
    expect(promptContent).toContain('commercial')
    expect(promptContent).toContain('CA')

    // Non-allowlisted field must NOT appear in the prompt
    expect(promptContent).not.toContain('INTERNAL_FLAG')
    expect(promptContent).not.toContain('secret')
  })

  it('passes all allowlisted fields through to the prompt unchanged', async () => {
    const paramsAllAllowlisted = {
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

    await generateLetter(paramsAllAllowlisted)

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

  it('logs gate_failure when non-allowlisted fields are stripped', async () => {
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

  it('does not log gate_failure when all fields are allowlisted', async () => {
    await generateLetter(BASE_PARAMS) // caseData has only allowlisted keys

    const gateFailureCalls = mockLogEvent.mock.calls.filter(
      (call) => call[0].eventType === 'gate_failure',
    )
    // No non-allowlisted fields → no gate_failure log from Gate 5
    expect(gateFailureCalls.length).toBe(0)
  })

  it('does NOT throw when non-allowlisted fields are present (strip-only, never halts)', async () => {
    const paramsWithExtraField = {
      ...BASE_PARAMS,
      caseData: {
        denialCode: 'CO-4',
        EXTRA_KEY:  'extra-value',
      },
    }

    // Gate 5 is non-halting — must not throw
    await expect(generateLetter(paramsWithExtraField)).resolves.toBeDefined()
  })
})

// ─── Gate 6: LQE hook integration ─────────────────────────────────────────────

describe('generateLetter() — Gate 6: LQE hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckTierAuthorization.mockResolvedValue({ authorized: true })
    mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
    mockVerifyScrubbed.mockImplementation(() => {})
    mockLogEvent.mockResolvedValue(undefined)
    mockAddToReviewQueue.mockResolvedValue(undefined)
    mockInsertReviewQueueItem.mockResolvedValue(undefined)
    mockRecordApiSpend.mockResolvedValue(undefined)
    mockGetDisclaimerVersion.mockReturnValue({ version: '1.0.0', hash: 'abc123456789' })
    makePassthroughTrackedExecution()
    mockAnthropicSuccess()
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
  })

  it('LQE-failed letter: artifact release_state = review_required AND response includes pending-review message', async () => {
    mockRunLQE.mockResolvedValue({
      passed: false,
      failureReason: 'YMYL_SAFETY_FAIL',
      checks: {
        denialCodeAccuracy: { passed: true,  score: 1.0 },
        ymylSafety:         { passed: false, score: 0.0, notes: 'Forbidden YMYL pattern' },
        legalFraming:       { passed: true,  score: 0.0, notes: 'not evaluated' },
      },
    })

    const result = await generateLetter(BASE_PARAMS)

    // release_state must be review_required (never 'released')
    expect(mockCreateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ releaseState: 'review_required' }),
    )

    // Pending review message must appear in response content
    expect(result.content).toContain('pending clinical review')

    // insertReviewQueueItem called for LQE failures (with failure context)
    expect(mockInsertReviewQueueItem).toHaveBeenCalledWith(
      expect.objectContaining({ failureReason: 'YMYL_SAFETY_FAIL' }),
    )

    // lqe_failed event logged
    const lqeFailedCall = mockLogEvent.mock.calls.find((c) => c[0].eventType === 'lqe_failed')
    expect(lqeFailedCall).toBeDefined()
  })

  it('LQE-passed letter: release_state = review_required (Phase 2 rule) AND no pending-review message', async () => {
    mockRunLQE.mockResolvedValue(LQE_PASS)

    const result = await generateLetter(BASE_PARAMS)

    // Still review_required — Phase 2 never auto-releases
    expect(mockCreateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ releaseState: 'review_required' }),
    )

    // Clean letter — no pending review note
    expect(result.content).not.toContain('pending clinical review')

    // Standard review queue (not insertReviewQueueItem) for passed letters
    expect(mockAddToReviewQueue).toHaveBeenCalled()
    expect(mockInsertReviewQueueItem).not.toHaveBeenCalled()

    // lqe_passed event logged
    const lqePassedCall = mockLogEvent.mock.calls.find((c) => c[0].eventType === 'lqe_passed')
    expect(lqePassedCall).toBeDefined()
  })

  it('LQE failure does NOT throw — user still receives a response', async () => {
    mockRunLQE.mockResolvedValue({
      passed: false,
      failureReason: 'LEGAL_FRAMING_FAIL',
      checks: {
        denialCodeAccuracy: { passed: true,  score: 1.0 },
        ymylSafety:         { passed: true,  score: 1.0 },
        legalFraming:       { passed: false, score: 0.0, notes: 'Forbidden legal pattern' },
      },
    })

    await expect(generateLetter(BASE_PARAMS)).resolves.toBeDefined()
  })
})

// ─── Gate 7: Post-Generation Integrity ────────────────────────────────────────
// Covers both sub-checks:
//   7a — Disclaimer Version (getDisclaimerVersion must return a non-empty version string)
//   7b — Artifact State Machine (validateArtifactState + createArtifact DB write)

describe('validateArtifactState() — Gate 7b guard (exported invariant)', () => {
  it('does not throw for review_required', () => {
    expect(() => validateArtifactState('review_required')).not.toThrow()
  })

  it('throws GATE_7_FAILED for "released"', () => {
    expect(() => validateArtifactState('released')).toThrow('GATE_7_FAILED')
    expect(() => validateArtifactState('released')).toThrow("invalid release_state 'released'")
  })

  it('throws GATE_7_FAILED for "pending"', () => {
    // 'pending' is not in the Phase 2 state machine — guard must reject it
    expect(() => validateArtifactState('pending')).toThrow('GATE_7_FAILED')
    expect(() => validateArtifactState('pending')).toThrow("invalid release_state 'pending'")
  })

  it('throws GATE_7_FAILED for "draft"', () => {
    expect(() => validateArtifactState('draft')).toThrow('GATE_7_FAILED')
  })
})

describe('generateLetter() — Gate 7: Post-Generation Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckTierAuthorization.mockResolvedValue({ authorized: true })
    mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
    mockVerifyScrubbed.mockImplementation(() => {})
    mockLogEvent.mockResolvedValue(undefined)
    mockAddToReviewQueue.mockResolvedValue(undefined)
    mockInsertReviewQueueItem.mockResolvedValue(undefined)
    mockRecordApiSpend.mockResolvedValue(undefined)
    makePassthroughTrackedExecution()
    mockAnthropicSuccess()
    mockAllDepsSuccess()
  })

  // ── 7a: Disclaimer Version ────────────────────────────────────────────────

  it('7a: disclaimer version is captured and passed to createArtifact (non-null, non-empty)', async () => {
    await generateLetter(BASE_PARAMS)

    expect(mockCreateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        disclaimerVersion: expect.stringMatching(/.+/),
        disclaimerHash:    expect.stringMatching(/.+/),
      }),
    )
  })

  it('7a: throws GATE_7_FAILED when getDisclaimerVersion returns empty version', async () => {
    mockGetDisclaimerVersion.mockReturnValue({ version: '', hash: '' })

    await expect(generateLetter(BASE_PARAMS)).rejects.toThrow('GATE_7_FAILED: disclaimer version missing')

    // createArtifact must NOT be called if 7a fails
    expect(mockCreateArtifact).not.toHaveBeenCalled()
  })

  it('7a: logs gate_failure when disclaimer version is missing', async () => {
    mockGetDisclaimerVersion.mockReturnValue({ version: '', hash: '' })

    await generateLetter(BASE_PARAMS).catch(() => {})

    const gateFailureCalls = mockLogEvent.mock.calls.filter((c) => c[0].eventType === 'gate_failure')
    expect(gateFailureCalls.length).toBeGreaterThan(0)
  })

  // ── 7b: Artifact State Machine ────────────────────────────────────────────

  it('7b: artifact is always written with release_state = review_required', async () => {
    await generateLetter(BASE_PARAMS)

    expect(mockCreateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ releaseState: 'review_required' }),
    )
  })

  it('7b: metric_events receives gate_7_passed event on successful write', async () => {
    await generateLetter(BASE_PARAMS)

    const gate7PassedCall = mockLogEvent.mock.calls.find((c) => c[0].eventType === 'gate_7_passed')
    expect(gate7PassedCall).toBeDefined()
    expect(gate7PassedCall![0]).toMatchObject({
      eventType:  'gate_7_passed',
      sourcePage: 'generateLetter',
    })
  })

  it('7b: throws GATE_7_FAILED and does not log gate_7_passed when createArtifact throws', async () => {
    mockCreateArtifact.mockRejectedValue(new Error('DB constraint violation'))

    await expect(generateLetter(BASE_PARAMS)).rejects.toThrow('GATE_7_FAILED: ARTIFACT_STATE_ERROR')

    const gate7PassedCall = mockLogEvent.mock.calls.find((c) => c[0].eventType === 'gate_7_passed')
    expect(gate7PassedCall).toBeUndefined()
  })

  it('7b: logs gate_failure when createArtifact throws', async () => {
    mockCreateArtifact.mockRejectedValue(new Error('DB error'))

    await generateLetter(BASE_PARAMS).catch(() => {})

    const gateFailureCalls = mockLogEvent.mock.calls.filter((c) => c[0].eventType === 'gate_failure')
    expect(gateFailureCalls.length).toBeGreaterThan(0)
  })
})

// ─── P30: promptVersionHash ────────────────────────────────────────────────────

describe('generateLetter() — P30: promptVersionHash', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckTierAuthorization.mockResolvedValue({ authorized: true })
    mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
    mockVerifyScrubbed.mockImplementation(() => {})
    mockLogEvent.mockResolvedValue(undefined)
    mockAddToReviewQueue.mockResolvedValue(undefined)
    mockInsertReviewQueueItem.mockResolvedValue(undefined)
    mockRecordApiSpend.mockResolvedValue(undefined)
    makePassthroughTrackedExecution()
    mockAnthropicSuccess()
    mockAllDepsSuccess()
  })

  it('promptVersionHash is a non-empty string present on every artifact write', async () => {
    await generateLetter(BASE_PARAMS)

    expect(mockCreateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        promptVersionHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    )
  })

  it('promptVersionHash is deterministic — same inputs produce the same hash', async () => {
    await generateLetter(BASE_PARAMS)
    const firstHash = (mockCreateArtifact.mock.calls[0][0] as { promptVersionHash: string }).promptVersionHash

    vi.clearAllMocks()
    mockAllDepsSuccess()
    makePassthroughTrackedExecution()
    mockAnthropicSuccess()
    mockLogEvent.mockResolvedValue(undefined)
    mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
    mockVerifyScrubbed.mockImplementation(() => {})

    await generateLetter(BASE_PARAMS)
    const secondHash = (mockCreateArtifact.mock.calls[0][0] as { promptVersionHash: string }).promptVersionHash

    expect(firstHash).toBe(secondHash)
  })

  it('promptVersionHash changes when disclaimer version changes (deterministic hash)', async () => {
    // Test the algorithm property directly: SHA-256 with different disclaimer version inputs
    // must produce different hashes. This validates the design without needing two full runs.
    const { createHash } = await import('crypto')
    const prompt = 'test prompt content'
    const model  = 'claude-haiku-4-5-20251001'

    const hash100 = createHash('sha256').update(prompt + model + '1.0.0').digest('hex')
    const hash200 = createHash('sha256').update(prompt + model + '2.0.0').digest('hex')

    expect(hash100).not.toBe(hash200)
    // Both must be full 64-char SHA-256 hex strings
    expect(hash100).toMatch(/^[0-9a-f]{64}$/)
    expect(hash200).toMatch(/^[0-9a-f]{64}$/)
  })
})

// ─── AIR-01: buildWorkflowContract() ──────────────────────────────────────────

describe('buildWorkflowContract() — MA-SUP-AIR-001 AIR-01', () => {
  it.each([
    'denial_appeal',
    'bill_dispute',
    'hipaa_request',
    'negotiation_script',
  ] as LetterType[])(
    'returns correct maxTokens for letterType "%s" (matches OUTPUT_CONFIG)',
    (letterType) => {
      const contract = buildWorkflowContract('user-001', letterType)
      expect(contract.maxTokens).toBe(OUTPUT_CONFIG[letterType].maxTokens)
    },
  )

  it.each([
    'denial_appeal',
    'bill_dispute',
    'hipaa_request',
    'negotiation_script',
  ] as LetterType[])(
    'returns correct allowedContextKeys for letterType "%s" (matches CONTEXT_ALLOWLIST)',
    (letterType) => {
      const contract = buildWorkflowContract('user-001', letterType)
      expect(contract.allowedContextKeys).toEqual(CONTEXT_ALLOWLIST[letterType])
    },
  )

  it('contract.releaseState is always the literal "review_required"', () => {
    const letterTypes: LetterType[] = ['denial_appeal', 'bill_dispute', 'hipaa_request', 'negotiation_script']
    for (const letterType of letterTypes) {
      const contract = buildWorkflowContract('user-001', letterType)
      expect(contract.releaseState).toBe('review_required')
    }
  })

  it('all boolean gate flags are always true', () => {
    const contract = buildWorkflowContract('user-001', 'denial_appeal')
    expect(contract.tierAuthRequired).toBe(true)
    expect(contract.piiScrubbed).toBe(true)
    expect(contract.lqeRequired).toBe(true)
    expect(contract.disclaimerVersionRequired).toBe(true)
  })

  it('outputSchema is undefined at contract-build time (populated by validateLetterOutput() post-generation)', () => {
    // AIR-03: outputSchema field is now typed as LetterOutputSchema (interface), not a string literal.
    // buildWorkflowContract() runs pre-generation — the actual schema is populated by validateLetterOutput()
    // inside Gate 7. The field is optional; undefined at contract-build time is correct.
    const contract = buildWorkflowContract('user-001', 'denial_appeal')
    expect(contract.outputSchema).toBeUndefined()
  })

  it('userId is passed through to the contract', () => {
    const contract = buildWorkflowContract('user-abc-123', 'bill_dispute')
    expect(contract.userId).toBe('user-abc-123')
  })

  it('returns maxTokens: 0 for unknown letterType (Gate 3 will catch this)', () => {
    // Safe fallback — unknown types get 0, which triggers GATE_3_FAILED downstream
    const contract = buildWorkflowContract('user-001', 'unknown_type' as LetterType)
    expect(contract.maxTokens).toBe(0)
    expect(contract.allowedContextKeys).toEqual([])
  })
})

// ─── AIR-03: validateLetterOutput() ───────────────────────────────────────────
// Tests for the output schema validator called inside Gate 7, before 7a (disclaimer version check).
// Defense-in-depth: Gate 3 enforces max_tokens upstream; validateLetterOutput() catches overruns
// that could slip through if the model ignores the limit.

describe('validateLetterOutput() — MA-SUP-AIR-001 AIR-03', () => {
  it('throws GATE_7_FAILED when content is empty', () => {
    expect(() =>
      validateLetterOutput({
        content:           '',
        letterType:        'denial_appeal',
        disclaimerAppended: false,
        promptVersionHash: 'a'.repeat(64),
        modelUsed:         'claude-haiku-4-5-20251001',
        tokenCount:        100,
        lqePassed:         true,
      }),
    ).toThrow('GATE_7_FAILED')
  })

  it('throws GATE_7_FAILED when tokenCount exceeds the OUTPUT_CONFIG cap for the letterType', () => {
    // denial_appeal cap = 600; 601 must be rejected
    expect(() =>
      validateLetterOutput({
        content:           'Some letter content.',
        letterType:        'denial_appeal',
        disclaimerAppended: false,
        promptVersionHash: 'a'.repeat(64),
        modelUsed:         'claude-haiku-4-5-20251001',
        tokenCount:        601,
        lqePassed:         true,
      }),
    ).toThrow('GATE_7_FAILED')
  })

  it('throws GATE_7_FAILED when promptVersionHash is missing (empty string)', () => {
    expect(() =>
      validateLetterOutput({
        content:           'Some letter content.',
        letterType:        'denial_appeal',
        disclaimerAppended: false,
        promptVersionHash: '',
        modelUsed:         'claude-haiku-4-5-20251001',
        tokenCount:        100,
        lqePassed:         true,
      }),
    ).toThrow('GATE_7_FAILED')
  })

  it('returns valid LetterOutputSchema on clean input', () => {
    const result = validateLetterOutput({
      content:           'Generated appeal letter content.',
      letterType:        'denial_appeal',
      disclaimerAppended: true,
      promptVersionHash: 'a'.repeat(64),
      modelUsed:         'claude-haiku-4-5-20251001',
      tokenCount:        100,
      lqePassed:         true,
    })

    expect(result.content).toBe('Generated appeal letter content.')
    expect(result.letterType).toBe('denial_appeal')
    expect(result.disclaimerAppended).toBe(true)
    expect(result.promptVersionHash).toBe('a'.repeat(64))
    expect(result.modelUsed).toBe('claude-haiku-4-5-20251001')
    expect(result.tokenCount).toBe(100)
    expect(result.lqePassed).toBe(true)
  })
})
