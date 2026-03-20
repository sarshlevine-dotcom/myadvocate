/**
 * Tests for the Letter Quality Evaluator (LQE) — MA-AUT-006 §G1
 *
 * Three sequential checks: denial code accuracy → YMYL safety → legal framing.
 * All deterministic (regex + DB lookups). NO Anthropic API calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock denial-codes DB helper (the only external I/O in LQE) ───────────────

const mockGetDenialCodeByCode = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/denial-codes', () => ({
  getDenialCodeByCode: mockGetDenialCodeByCode,
}))

import { runLQE } from '@/lib/lqe'
import type { LQEInput } from '@/lib/lqe'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const BASE_INPUT: LQEInput = {
  letterContent: 'We respectfully request reconsideration of this claim based on the documented medical necessity.',
  letterType:    'denial_appeal',
  denialCode:    'CO-4',
  artifactId:    'art-test-001',
  userId:        'a'.repeat(64), // pre-hashed SHA-256 (64 hex chars)
}

function cleanLetter(): string {
  return 'We respectfully request that this claim be reconsidered. The service was medically appropriate and supported by documentation.'
}

// ─── CHECK 1: Denial Code Accuracy ───────────────────────────────────────────

describe('LQE — Check 1: Denial Code Accuracy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('auto-passes (score 1.0) when letterType is not denial_appeal', async () => {
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'bill_dispute',
      letterContent: cleanLetter(),
      denialCode:    undefined,
    })

    expect(result.checks.denialCodeAccuracy.passed).toBe(true)
    expect(result.checks.denialCodeAccuracy.score).toBe(1.0)
    expect(mockGetDenialCodeByCode).not.toHaveBeenCalled()
  })

  it('auto-passes when letterType is denial_appeal but denialCode is not provided', async () => {
    const result = await runLQE({
      ...BASE_INPUT,
      letterContent: cleanLetter(),
      denialCode:    undefined,
    })

    expect(result.checks.denialCodeAccuracy.passed).toBe(true)
    expect(result.checks.denialCodeAccuracy.score).toBe(1.0)
    expect(mockGetDenialCodeByCode).not.toHaveBeenCalled()
  })

  it('passes when denial_appeal letter contains appeal_angle keywords', async () => {
    mockGetDenialCodeByCode.mockResolvedValue({
      appeal_angle: 'request itemized deductible accumulation documentation',
    })

    const result = await runLQE({
      ...BASE_INPUT,
      letterContent: 'We request itemized deductible accumulation documentation for this claim.',
      letterType:    'denial_appeal',
      denialCode:    'CO-1',
    })

    expect(result.checks.denialCodeAccuracy.passed).toBe(true)
    expect(result.checks.denialCodeAccuracy.score).toBeGreaterThanOrEqual(0.6)
  })

  it('fails when denial_appeal letter does not contain appeal_angle keywords → failureReason = DENIAL_CODE_ACCURACY_FAIL', async () => {
    mockGetDenialCodeByCode.mockResolvedValue({
      appeal_angle: 'deductible accumulation itemized verification documentation',
    })

    const result = await runLQE({
      ...BASE_INPUT,
      // Letter is about something entirely different — no keyword overlap
      letterContent: 'This pharmacy dispute concerns a completely unrelated prescription billing error.',
      letterType:    'denial_appeal',
      denialCode:    'CO-1',
    })

    expect(result.checks.denialCodeAccuracy.passed).toBe(false)
    expect(result.passed).toBe(false)
    expect(result.failureReason).toBe('DENIAL_CODE_ACCURACY_FAIL')
  })

  it('auto-passes when denial code is not found in the DB (null return)', async () => {
    mockGetDenialCodeByCode.mockResolvedValue(null)

    const result = await runLQE({
      ...BASE_INPUT,
      letterContent: cleanLetter(),
      letterType:    'denial_appeal',
      denialCode:    'UNKNOWN-99',
    })

    expect(result.checks.denialCodeAccuracy.passed).toBe(true)
    expect(result.checks.denialCodeAccuracy.score).toBe(1.0)
  })

  it('auto-passes when denial code record has no appeal_angle', async () => {
    mockGetDenialCodeByCode.mockResolvedValue({ appeal_angle: null })

    const result = await runLQE({
      ...BASE_INPUT,
      letterContent: cleanLetter(),
      letterType:    'denial_appeal',
      denialCode:    'CO-1',
    })

    expect(result.checks.denialCodeAccuracy.passed).toBe(true)
  })
})

// ─── CHECK 2: YMYL Safety ─────────────────────────────────────────────────────

describe('LQE — Check 2: YMYL Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Use bill_dispute so CHECK 1 auto-passes and doesn't interfere
  })

  it('fails when letter contains "you have been diagnosed" → failureReason = YMYL_SAFETY_FAIL', async () => {
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'bill_dispute',
      letterContent: 'Based on records, you have been diagnosed with a condition that requires treatment.',
      denialCode:    undefined,
    })

    expect(result.checks.ymylSafety.passed).toBe(false)
    expect(result.passed).toBe(false)
    expect(result.failureReason).toBe('YMYL_SAFETY_FAIL')
  })

  it('fails when letter contains "will definitely be approved"', async () => {
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'bill_dispute',
      letterContent: 'This appeal will definitely be approved given the evidence.',
      denialCode:    undefined,
    })

    expect(result.checks.ymylSafety.passed).toBe(false)
    expect(result.failureReason).toBe('YMYL_SAFETY_FAIL')
  })

  it('fails when letter contains "guaranteed coverage"', async () => {
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'negotiation_script',
      letterContent: 'The policy provides guaranteed coverage for this service.',
      denialCode:    undefined,
    })

    expect(result.checks.ymylSafety.passed).toBe(false)
    expect(result.failureReason).toBe('YMYL_SAFETY_FAIL')
  })

  it('fails when letter contains "you do not need"', async () => {
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'hipaa_request',
      letterContent: 'According to the clinical notes, you do not need this procedure.',
      denialCode:    undefined,
    })

    expect(result.checks.ymylSafety.passed).toBe(false)
    expect(result.failureReason).toBe('YMYL_SAFETY_FAIL')
  })

  it('passes a clean letter with no YMYL violations', async () => {
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'bill_dispute',
      letterContent: cleanLetter(),
      denialCode:    undefined,
    })

    expect(result.checks.ymylSafety.passed).toBe(true)
    expect(result.checks.ymylSafety.score).toBe(1.0)
  })

  it('YMYL check always runs for every letterType — hipaa_request is not exempt', async () => {
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'hipaa_request',
      letterContent: 'This treatment is not medically necessary per review.',
      denialCode:    undefined,
    })

    expect(result.checks.ymylSafety.passed).toBe(false)
    expect(result.failureReason).toBe('YMYL_SAFETY_FAIL')
  })
})

// ─── CHECK 3: Legal Framing ───────────────────────────────────────────────────

describe('LQE — Check 3: Legal Framing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Use bill_dispute (CHECK 1 auto-passes) with clean YMYL content (CHECK 2 passes)
  })

  it('fails when letter contains "you are legally entitled to"', async () => {
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'bill_dispute',
      letterContent: 'Under your plan, you are legally entitled to this coverage.',
      denialCode:    undefined,
    })

    expect(result.checks.legalFraming.passed).toBe(false)
    expect(result.failureReason).toBe('LEGAL_FRAMING_FAIL')
  })

  it('fails when letter contains "you should contact an attorney" — caught by FORBIDDEN_PHRASES (Check 2) before Check 3 runs', async () => {
    // "attorney" is in FORBIDDEN_PHRASES (compliance-static.ts AIR-04) — categorically forbidden.
    // Check 2 catches it before Check 3's contextual LEGAL_PATTERNS get a chance to run.
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'denial_appeal',
      letterContent: cleanLetter() + ' If this is denied again, you should contact an attorney immediately.',
      denialCode:    undefined,
    })

    expect(result.checks.ymylSafety.passed).toBe(false)
    expect(result.checks.ymylSafety.notes).toContain('forbidden_phrase_detected')
    expect(result.failureReason).toBe('YMYL_SAFETY_FAIL')
  })

  it('fails when letter contains "I recommend contacting a lawyer"', async () => {
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'bill_dispute',
      letterContent: cleanLetter() + ' I recommend contacting a lawyer to pursue this further.',
      denialCode:    undefined,
    })

    expect(result.checks.legalFraming.passed).toBe(false)
    expect(result.failureReason).toBe('LEGAL_FRAMING_FAIL')
  })

  it('fails when letter contains a violation-of-law determination', async () => {
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'bill_dispute',
      letterContent: 'This constitutes a violation of your contract with the insurer.',
      denialCode:    undefined,
    })

    expect(result.checks.legalFraming.passed).toBe(false)
    expect(result.failureReason).toBe('LEGAL_FRAMING_FAIL')
  })

  it('fails when "attorney" appears in any context — FORBIDDEN_PHRASES is categorical (AIR-04)', async () => {
    // Prior behavior: only "you should contact an attorney" pattern failed (Check 3 contextual).
    // AIR-04 FORBIDDEN_PHRASES makes "attorney" categorically forbidden in Check 2 regardless of context.
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'denial_appeal',
      letterContent: 'Our legal team has reviewed the policy terms. The attorney who drafted this policy noted the coverage.',
      denialCode:    undefined,
    })

    expect(result.checks.ymylSafety.passed).toBe(false)
    expect(result.checks.ymylSafety.notes).toContain('forbidden_phrase_detected')
    expect(result.passed).toBe(false)
  })

  it('legal framing check always runs for every letterType', async () => {
    // Letter uses a Check 3 violation-of-law pattern with no FORBIDDEN_PHRASES,
    // so Check 2 passes and Check 3 is what catches the issue.
    // "This constitutes a violation of law" hits LEGAL_PATTERNS[1] precisely.
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'negotiation_script',
      letterContent: 'This constitutes a violation of law that must be addressed.',
      denialCode:    undefined,
    })

    expect(result.checks.legalFraming.passed).toBe(false)
    expect(result.failureReason).toBe('LEGAL_FRAMING_FAIL')
  })
})

// ─── Serial execution and overall result ──────────────────────────────────────

describe('LQE — Serial execution and overall result', () => {
  beforeEach(() => vi.clearAllMocks())

  it('all three checks pass → LQEResult.passed === true, no failureReason', async () => {
    mockGetDenialCodeByCode.mockResolvedValue({
      appeal_angle: 'request documentation medical necessity appeal reconsideration',
    })

    const result = await runLQE({
      ...BASE_INPUT,
      letterContent: 'We request documentation supporting medical necessity for appeal reconsideration.',
      letterType:    'denial_appeal',
      denialCode:    'CO-4',
    })

    expect(result.passed).toBe(true)
    expect(result.failureReason).toBeUndefined()
    expect(result.checks.denialCodeAccuracy.passed).toBe(true)
    expect(result.checks.ymylSafety.passed).toBe(true)
    expect(result.checks.legalFraming.passed).toBe(true)
  })

  it('CHECK 1 fails → halts with DENIAL_CODE_ACCURACY_FAIL, subsequent checks marked not evaluated', async () => {
    mockGetDenialCodeByCode.mockResolvedValue({
      appeal_angle: 'deductible accumulation itemized verification',
    })

    // Even though YMYL violation is present, CHECK 1 fails first → halts
    const result = await runLQE({
      ...BASE_INPUT,
      letterContent: 'This pharmacy billing error is completely unrelated. will definitely be approved.',
      letterType:    'denial_appeal',
      denialCode:    'CO-1',
    })

    // CHECK 1 failure is the reported reason (serial halt)
    expect(result.passed).toBe(false)
    expect(result.failureReason).toBe('DENIAL_CODE_ACCURACY_FAIL')
    expect(result.checks.denialCodeAccuracy.passed).toBe(false)

    // Subsequent checks halted — marked not evaluated
    expect(result.checks.ymylSafety.notes).toBe('not evaluated')
    expect(result.checks.legalFraming.notes).toBe('not evaluated')
  })

  it('CHECK 2 fails → halts with YMYL_SAFETY_FAIL, CHECK 3 marked not evaluated', async () => {
    const result = await runLQE({
      ...BASE_INPUT,
      letterType:    'bill_dispute',
      // CHECK 1 auto-passes (not denial_appeal with denialCode)
      // CHECK 2 fails on YMYL; CHECK 3 would also fail but must not run
      letterContent: 'you have been diagnosed with a condition. you are legally entitled to coverage.',
      denialCode:    undefined,
    })

    expect(result.passed).toBe(false)
    expect(result.failureReason).toBe('YMYL_SAFETY_FAIL')
    expect(result.checks.ymylSafety.passed).toBe(false)
    expect(result.checks.legalFraming.notes).toBe('not evaluated')
  })
})
