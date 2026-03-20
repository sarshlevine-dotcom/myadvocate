/**
 * Tests for compliance-static.ts (MA-SUP-AIR-001 AIR-04)
 *
 * Covers:
 *   1. Static constant shape guarantees (FORBIDDEN_PHRASES, FORBIDDEN_CONTEXT_FIELDS,
 *      MAX_LETTER_CHARS, ALWAYS_KATE_REVIEW)
 *   2. LQE integration — FORBIDDEN_PHRASES triggers YMYL fail (Check 2)
 *   3. Gate 5 integration — FORBIDDEN_CONTEXT_FIELDS are stripped before prompt
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LetterType } from '@/types/domain'

// ─── Mocks required for LQE integration tests ─────────────────────────────────
// denial-codes DB is the only external I/O in runLQE

const mockGetDenialCodeByCode = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/denial-codes', () => ({
  getDenialCodeByCode: mockGetDenialCodeByCode,
}))

// ─── Mocks required for Gate 5 integration tests ──────────────────────────────

const mockMessagesCreate         = vi.hoisted(() => vi.fn())
const mockTrackedExecution       = vi.hoisted(() => vi.fn())
const mockScrubPII               = vi.hoisted(() => vi.fn())
const mockVerifyScrubbed         = vi.hoisted(() => vi.fn())
const mockCheckTierAuthorization = vi.hoisted(() => vi.fn())
const mockCreateArtifact         = vi.hoisted(() => vi.fn())
const mockAddToReviewQueue       = vi.hoisted(() => vi.fn())
const mockInsertReviewQueueItem  = vi.hoisted(() => vi.fn())
const mockLogEvent               = vi.hoisted(() => vi.fn())
const mockRecordApiSpend         = vi.hoisted(() => vi.fn())
const mockGetDisclaimerVersion   = vi.hoisted(() => vi.fn())
const mockInsertLQEResult        = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockMessagesCreate } }
  }),
}))
vi.mock('@/lib/pii-scrubber',        () => ({ scrubPII: mockScrubPII, verifyScrubbed: mockVerifyScrubbed }))
vi.mock('@/lib/auth-tier',           () => ({ checkTierAuthorization: mockCheckTierAuthorization }))
vi.mock('@/lib/tracked-execution',   () => ({ trackedExecution: mockTrackedExecution }))
vi.mock('@/lib/db/artifacts',        () => ({ createArtifact: mockCreateArtifact }))
vi.mock('@/lib/db/review-queue',     () => ({
  addToReviewQueue:      mockAddToReviewQueue,
  insertReviewQueueItem: mockInsertReviewQueueItem,
}))
vi.mock('@/lib/db/metric-events',           () => ({ logEvent: mockLogEvent }))
vi.mock('@/lib/budget-monitor',             () => ({ recordApiSpend: mockRecordApiSpend }))
// NOTE: @/lib/lqe is NOT mocked here — the real runLQE must execute for LQE integration tests.
// Gate 5 tests call generateLetter() which internally uses the real runLQE.
// The only external dep runLQE needs (getDenialCodeByCode) is mocked via @/lib/db/denial-codes above.
vi.mock('@/lib/db/letter-quality-evaluations', () => ({ insertLQEResult: mockInsertLQEResult }))
vi.mock('@/lib/disclaimer', () => ({
  appendDisclaimer:           (content: string) => content + '\n\n---\nDISCLAIMER TEST',
  CURRENT_DISCLAIMER_VERSION: '1.0.0',
  DISCLAIMER_HASH:            'abc123456789',
  getDisclaimerVersion:       mockGetDisclaimerVersion,
}))

// Imports under test — after all vi.mock() calls
import {
  FORBIDDEN_PHRASES,
  FORBIDDEN_CONTEXT_FIELDS,
  MAX_LETTER_CHARS,
  ALWAYS_KATE_REVIEW,
} from '@/lib/compliance-static'
// Real runLQE — not mocked so integration tests exercise the actual FORBIDDEN_PHRASES scan
import { runLQE }         from '@/lib/lqe'
import { generateLetter } from '@/lib/generate-letter'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LETTER_TYPES: LetterType[] = [
  'denial_appeal',
  'bill_dispute',
  'hipaa_request',
  'negotiation_script',
]

const BASE_GENERATE_PARAMS = {
  caseId:     'case-001',
  userId:     'user-001',
  letterType: 'denial_appeal' as LetterType,
  caseData:   { denialCode: 'CO-4', insurerType: 'commercial', state: 'CA' },
}

function setupAllDepsMocked() {
  mockCheckTierAuthorization.mockResolvedValue({ authorized: true })
  mockScrubPII.mockImplementation((data: Record<string, unknown>) => ({ ...data }))
  mockVerifyScrubbed.mockImplementation(() => {})
  // Real runLQE runs — getDenialCodeByCode returns null so Check 1 auto-passes.
  // Mock Anthropic returns "Generated appeal letter content." which passes all 3 LQE checks.
  mockGetDenialCodeByCode.mockResolvedValue(null)
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
  mockInsertLQEResult.mockResolvedValue(undefined)
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
  mockMessagesCreate.mockResolvedValue({
    content: [{ type: 'text', text: 'Generated appeal letter content.' }],
    usage:   { input_tokens: 100, output_tokens: 50 },
    model:   'claude-haiku-4-5-20251001',
  })
}

// ─── FORBIDDEN_PHRASES shape ──────────────────────────────────────────────────

describe('FORBIDDEN_PHRASES', () => {
  it('contains at least 5 entries', () => {
    expect(FORBIDDEN_PHRASES.length).toBeGreaterThanOrEqual(5)
  })

  it('all entries are non-empty strings', () => {
    for (const phrase of FORBIDDEN_PHRASES) {
      expect(typeof phrase).toBe('string')
      expect(phrase.length).toBeGreaterThan(0)
    }
  })

  it('includes "guaranteed"', () => {
    expect(FORBIDDEN_PHRASES).toContain('guaranteed')
  })

  it('includes "lawsuit"', () => {
    expect(FORBIDDEN_PHRASES).toContain('lawsuit')
  })

  it('includes "malpractice"', () => {
    expect(FORBIDDEN_PHRASES).toContain('malpractice')
  })
})

// ─── FORBIDDEN_CONTEXT_FIELDS shape ───────────────────────────────────────────

describe('FORBIDDEN_CONTEXT_FIELDS', () => {
  it('contains "ssn"', () => {
    expect(FORBIDDEN_CONTEXT_FIELDS).toContain('ssn')
  })

  it('contains "dateOfBirth"', () => {
    expect(FORBIDDEN_CONTEXT_FIELDS).toContain('dateOfBirth')
  })

  it('all entries are non-empty strings', () => {
    for (const field of FORBIDDEN_CONTEXT_FIELDS) {
      expect(typeof field).toBe('string')
      expect(field.length).toBeGreaterThan(0)
    }
  })
})

// ─── MAX_LETTER_CHARS shape ────────────────────────────────────────────────────

describe('MAX_LETTER_CHARS', () => {
  it('covers all LetterType values', () => {
    for (const letterType of LETTER_TYPES) {
      expect(MAX_LETTER_CHARS[letterType]).toBeDefined()
    }
  })

  it('all values are positive numbers', () => {
    for (const letterType of LETTER_TYPES) {
      expect(MAX_LETTER_CHARS[letterType]).toBeGreaterThan(0)
    }
  })
})

// ─── ALWAYS_KATE_REVIEW shape ──────────────────────────────────────────────────

describe('ALWAYS_KATE_REVIEW', () => {
  it('is an array (empty in Phase 2)', () => {
    expect(Array.isArray(ALWAYS_KATE_REVIEW)).toBe(true)
    expect(ALWAYS_KATE_REVIEW.length).toBe(0)
  })
})

// ─── LQE integration: FORBIDDEN_PHRASES triggers YMYL fail ────────────────────
// Tests that runLQE (Check 2) actually rejects letters containing FORBIDDEN_PHRASES.
// runLQE is imported directly (not through generateLetter) so the test is focused
// on the compliance-static → LQE integration path only.

describe('LQE + FORBIDDEN_PHRASES integration (Check 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // getDenialCodeByCode returns null → Check 1 auto-passes (benefit of the doubt)
    mockGetDenialCodeByCode.mockResolvedValue(null)
  })

  it('LQE fails when letter contains a FORBIDDEN_PHRASE ("guaranteed")', async () => {
    const result = await runLQE({
      letterContent: 'Your appeal is guaranteed to succeed.',
      letterType:    'denial_appeal',
      denialCode:    undefined,
      artifactId:    'art-test-001',
      userId:        'a'.repeat(64),
    })

    expect(result.passed).toBe(false)
    expect(result.checks.ymylSafety.passed).toBe(false)
    expect(result.checks.ymylSafety.notes).toContain('forbidden_phrase_detected')
    expect(result.checks.ymylSafety.notes).toContain('guaranteed')
  })

  it('LQE fails when letter contains "lawsuit"', async () => {
    const result = await runLQE({
      letterContent: 'You may want to file a lawsuit against the insurer.',
      letterType:    'bill_dispute',
      denialCode:    undefined,
      artifactId:    'art-test-002',
      userId:        'a'.repeat(64),
    })

    expect(result.passed).toBe(false)
    expect(result.failureReason).toBe('YMYL_SAFETY_FAIL')
    expect(result.checks.ymylSafety.notes).toContain('forbidden_phrase_detected')
  })

  it('FORBIDDEN_PHRASE check is case-insensitive ("GUARANTEED" uppercase)', async () => {
    const result = await runLQE({
      letterContent: 'This outcome is GUARANTEED.',
      letterType:    'denial_appeal',
      denialCode:    undefined,
      artifactId:    'art-test-003',
      userId:        'a'.repeat(64),
    })

    expect(result.passed).toBe(false)
    expect(result.checks.ymylSafety.passed).toBe(false)
  })

  it('FORBIDDEN_PHRASE check is case-insensitive ("You Will Win" mixed case)', async () => {
    const result = await runLQE({
      letterContent: 'You Will Win this appeal.',
      letterType:    'denial_appeal',
      denialCode:    undefined,
      artifactId:    'art-test-004',
      userId:        'a'.repeat(64),
    })

    expect(result.passed).toBe(false)
    expect(result.checks.ymylSafety.passed).toBe(false)
  })

  it('LQE passes for a clean letter with no forbidden phrases', async () => {
    const result = await runLQE({
      letterContent: 'We respectfully request reconsideration of this claim based on the documented medical necessity.',
      letterType:    'denial_appeal',
      denialCode:    undefined,
      artifactId:    'art-test-005',
      userId:        'a'.repeat(64),
    })

    expect(result.passed).toBe(true)
    expect(result.checks.ymylSafety.passed).toBe(true)
  })

  it('legalFraming check is skipped (NOT_RUN) when YMYL fails first (serial halt)', async () => {
    const result = await runLQE({
      letterContent: 'We guarantee your appeal will succeed.',
      letterType:    'denial_appeal',
      denialCode:    undefined,
      artifactId:    'art-test-006',
      userId:        'a'.repeat(64),
    })

    expect(result.checks.ymylSafety.passed).toBe(false)
    expect(result.checks.legalFraming.notes).toBe('not evaluated')
  })
})

// ─── Gate 5 integration: FORBIDDEN_CONTEXT_FIELDS are stripped ────────────────
// Tests that generate-letter.ts Gate 5 strips fields from FORBIDDEN_CONTEXT_FIELDS
// before they reach the Anthropic prompt, and that GATE_5_FORBIDDEN_FIELD is logged.

describe('Gate 5 + FORBIDDEN_CONTEXT_FIELDS integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAllDepsMocked()
  })

  it('Gate 5 strips a FORBIDDEN_CONTEXT_FIELD ("ssn") before it reaches the prompt', async () => {
    const paramsWithForbiddenField = {
      ...BASE_GENERATE_PARAMS,
      caseData: {
        denialCode: 'CO-4',          // allowlisted for denial_appeal
        state:      'CA',            // allowlisted for denial_appeal
        ssn:        'FORBIDDEN-SSN-VALUE', // FORBIDDEN_CONTEXT_FIELD — must never reach prompt
      },
    }

    await generateLetter(paramsWithForbiddenField)

    const promptContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
    expect(promptContent).not.toContain('FORBIDDEN-SSN-VALUE')
    expect(promptContent).not.toContain('ssn')
  })

  it('Gate 5 strips "dateOfBirth" before it reaches the prompt', async () => {
    const paramsWithDOB = {
      ...BASE_GENERATE_PARAMS,
      caseData: {
        denialCode:  'CO-4',
        state:       'CA',
        dateOfBirth: '1990-01-01',  // FORBIDDEN_CONTEXT_FIELD
      },
    }

    await generateLetter(paramsWithDOB)

    const promptContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
    expect(promptContent).not.toContain('1990-01-01')
    expect(promptContent).not.toContain('dateOfBirth')
  })

  it('Gate 5 logs a gate_failure when FORBIDDEN_CONTEXT_FIELDS are stripped', async () => {
    const paramsWithForbiddenField = {
      ...BASE_GENERATE_PARAMS,
      caseData: {
        denialCode: 'CO-4',
        apiKey:     'sk-some-key',  // FORBIDDEN_CONTEXT_FIELD
      },
    }

    await generateLetter(paramsWithForbiddenField)

    const gateFailureCalls = mockLogEvent.mock.calls.filter(
      (call) => call[0].eventType === 'gate_failure',
    )
    expect(gateFailureCalls.length).toBeGreaterThan(0)
  })

  it('Gate 5 does NOT throw when FORBIDDEN_CONTEXT_FIELDS are present (strip-only, never halts)', async () => {
    const paramsWithForbiddenField = {
      ...BASE_GENERATE_PARAMS,
      caseData: {
        denialCode: 'CO-4',
        password:   'super-secret',  // FORBIDDEN_CONTEXT_FIELD
      },
    }

    await expect(generateLetter(paramsWithForbiddenField)).resolves.toBeDefined()
  })

  it('allowlisted fields still pass through when a FORBIDDEN_CONTEXT_FIELD is also present', async () => {
    const params = {
      ...BASE_GENERATE_PARAMS,
      caseData: {
        denialCode:  'CO-16',       // allowlisted
        insurerType: 'commercial',  // allowlisted
        state:       'TX',          // allowlisted
        ssn:         'SHOULD-NOT-APPEAR',  // forbidden
      },
    }

    await generateLetter(params)

    const promptContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
    expect(promptContent).toContain('CO-16')
    expect(promptContent).toContain('commercial')
    expect(promptContent).toContain('TX')
    expect(promptContent).not.toContain('SHOULD-NOT-APPEAR')
  })
})
