/**
 * Regression tests for the founder review queue (H1-08)
 *
 * Covers the full lifecycle of a review_queue row:
 *   - Creation with status 'pending'
 *   - Approval: decision → 'approved', reviewed_at set, reviewer_id set
 *   - Rejection: decision → 'rejected', risk_reason required
 *   - Invariant: approving a non-pending item throws
 *   - Invariant: rejecting without a reason throws
 *   - Invariant: rejecting a non-pending item throws
 *
 * All Supabase I/O is mocked — no real DB calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Supabase client ─────────────────────────────────────────────────────

const mockSingle   = vi.hoisted(() => vi.fn())
const mockSelect   = vi.hoisted(() => vi.fn())
const mockInsert   = vi.hoisted(() => vi.fn())
const mockFrom     = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: mockFrom,
  }),
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  addToReviewQueue,
  approveItem,
  rejectItem,
  getPendingReviews,
  getReviewQueueDepth,
} from '@/lib/db/review-queue'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id:          'rq-001',
    artifact_id: 'art-001',
    case_id:     'case-001',
    decision:    'pending',
    risk_reason: 'LQE_FAILED: low score',
    created_at:  '2026-01-01T00:00:00Z',
    reviewed_at: null,
    reviewer_id: null,
    ...overrides,
  }
}

// ─── addToReviewQueue ─────────────────────────────────────────────────────────

describe('addToReviewQueue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts a row and returns it with decision=pending', async () => {
    const created = makeRow()
    mockSingle.mockResolvedValueOnce({ data: created, error: null })
    mockSelect.mockReturnValueOnce({ single: mockSingle })
    mockInsert.mockReturnValueOnce({ select: mockSelect })
    mockFrom.mockReturnValueOnce({ insert: mockInsert })

    const result = await addToReviewQueue({
      artifactId: 'art-001',
      caseId:     'case-001',
      riskReason: 'LQE_FAILED: low score',
    })

    expect(result.decision).toBe('pending')
    expect(result.reviewed_at).toBeNull()
    expect(result.reviewer_id).toBeNull()
  })

  it('throws when Supabase returns an error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('DB error') })
    mockSelect.mockReturnValueOnce({ single: mockSingle })
    mockInsert.mockReturnValueOnce({ select: mockSelect })
    mockFrom.mockReturnValueOnce({ insert: mockInsert })

    await expect(
      addToReviewQueue({ artifactId: 'art-001', caseId: 'case-001', riskReason: 'x' }),
    ).rejects.toThrow('DB error')
  })
})

// ─── approveItem ─────────────────────────────────────────────────────────────

describe('approveItem', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets decision=approved, reviewed_at, and reviewer_id', async () => {
    const pending = makeRow({ decision: 'pending' })

    // First call: select to verify pending state
    const mockEq1 = vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce({ data: pending, error: null }) })
    const mockSelect1 = vi.fn().mockReturnValueOnce({ eq: mockEq1 })

    // Second call: update
    const mockEq2 = vi.fn().mockResolvedValueOnce({ error: null })
    const mockUpdate2 = vi.fn().mockReturnValueOnce({ eq: mockEq2 })

    mockFrom
      .mockReturnValueOnce({ select: mockSelect1 })
      .mockReturnValueOnce({ update: mockUpdate2 })

    await expect(approveItem('rq-001', 'reviewer-001')).resolves.toBeUndefined()
    expect(mockUpdate2).toHaveBeenCalledWith(
      expect.objectContaining({
        decision:    'approved',
        reviewer_id: 'reviewer-001',
      }),
    )
    expect(mockUpdate2.mock.calls[0][0]).toHaveProperty('reviewed_at')
  })

  it('throws when the item is not pending (already approved)', async () => {
    const approved = makeRow({ decision: 'approved' })
    const mockEq1 = vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce({ data: approved, error: null }) })
    const mockSelect1 = vi.fn().mockReturnValueOnce({ eq: mockEq1 })
    mockFrom.mockReturnValueOnce({ select: mockSelect1 })

    await expect(approveItem('rq-001', 'reviewer-001')).rejects.toThrow(/not pending/i)
  })

  it('throws when the item is not pending (already rejected)', async () => {
    const rejected = makeRow({ decision: 'rejected' })
    const mockEq1 = vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce({ data: rejected, error: null }) })
    const mockSelect1 = vi.fn().mockReturnValueOnce({ eq: mockEq1 })
    mockFrom.mockReturnValueOnce({ select: mockSelect1 })

    await expect(approveItem('rq-001', 'reviewer-001')).rejects.toThrow(/not pending/i)
  })

  it('throws when the DB select returns an error', async () => {
    const mockEq1 = vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce({ data: null, error: new Error('select failed') }) })
    const mockSelect1 = vi.fn().mockReturnValueOnce({ eq: mockEq1 })
    mockFrom.mockReturnValueOnce({ select: mockSelect1 })

    await expect(approveItem('rq-001', 'reviewer-001')).rejects.toThrow('select failed')
  })
})

// ─── rejectItem ───────────────────────────────────────────────────────────────

describe('rejectItem', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets decision=rejected with the supplied rejection reason', async () => {
    const pending = makeRow({ decision: 'pending' })
    const mockEq1 = vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce({ data: pending, error: null }) })
    const mockSelect1 = vi.fn().mockReturnValueOnce({ eq: mockEq1 })
    const mockEq2 = vi.fn().mockResolvedValueOnce({ error: null })
    const mockUpdate2 = vi.fn().mockReturnValueOnce({ eq: mockEq2 })

    mockFrom
      .mockReturnValueOnce({ select: mockSelect1 })
      .mockReturnValueOnce({ update: mockUpdate2 })

    await expect(
      rejectItem('rq-001', 'reviewer-001', 'Missing documentation'),
    ).resolves.toBeUndefined()

    expect(mockUpdate2).toHaveBeenCalledWith(
      expect.objectContaining({
        decision:    'rejected',
        reviewer_id: 'reviewer-001',
        risk_reason: 'Missing documentation',
      }),
    )
  })

  it('throws when rejection reason is empty string', async () => {
    await expect(rejectItem('rq-001', 'reviewer-001', '')).rejects.toThrow(/reason/i)
  })

  it('throws when rejection reason is whitespace only', async () => {
    await expect(rejectItem('rq-001', 'reviewer-001', '   ')).rejects.toThrow(/reason/i)
  })

  it('throws when the item is not pending (already approved)', async () => {
    const approved = makeRow({ decision: 'approved' })
    const mockEq1 = vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce({ data: approved, error: null }) })
    const mockSelect1 = vi.fn().mockReturnValueOnce({ eq: mockEq1 })
    mockFrom.mockReturnValueOnce({ select: mockSelect1 })

    await expect(
      rejectItem('rq-001', 'reviewer-001', 'Valid reason'),
    ).rejects.toThrow(/not pending/i)
  })

  it('throws when the DB select returns an error', async () => {
    const mockEq1 = vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce({ data: null, error: new Error('select failed') }) })
    const mockSelect1 = vi.fn().mockReturnValueOnce({ eq: mockEq1 })
    mockFrom.mockReturnValueOnce({ select: mockSelect1 })

    await expect(
      rejectItem('rq-001', 'reviewer-001', 'Valid reason'),
    ).rejects.toThrow('select failed')
  })
})

// ─── getPendingReviews ────────────────────────────────────────────────────────

describe('getPendingReviews', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns rows with decision=pending ordered by created_at', async () => {
    const rows = [makeRow(), makeRow({ id: 'rq-002', artifact_id: 'art-002' })]
    const mockOrder = vi.fn().mockResolvedValueOnce({ data: rows, error: null })
    const mockEqCall = vi.fn().mockReturnValueOnce({ order: mockOrder })
    const mockSelectCall = vi.fn().mockReturnValueOnce({ eq: mockEqCall })
    mockFrom.mockReturnValueOnce({ select: mockSelectCall })

    const result = await getPendingReviews()
    expect(result).toHaveLength(2)
    expect(result[0].decision).toBe('pending')
  })

  it('returns empty array when no pending rows exist', async () => {
    const mockOrder = vi.fn().mockResolvedValueOnce({ data: null, error: null })
    const mockEqCall = vi.fn().mockReturnValueOnce({ order: mockOrder })
    const mockSelectCall = vi.fn().mockReturnValueOnce({ eq: mockEqCall })
    mockFrom.mockReturnValueOnce({ select: mockSelectCall })

    const result = await getPendingReviews()
    expect(result).toEqual([])
  })
})

// ─── getReviewQueueDepth ──────────────────────────────────────────────────────

describe('getReviewQueueDepth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the count of pending rows', async () => {
    const mockEqCall = vi.fn().mockResolvedValueOnce({ count: 3, error: null })
    const mockSelectCall = vi.fn().mockReturnValueOnce({ eq: mockEqCall })
    mockFrom.mockReturnValueOnce({ select: mockSelectCall })

    const depth = await getReviewQueueDepth()
    expect(depth).toBe(3)
  })

  it('returns 0 when DB returns an error (safe default)', async () => {
    const mockEqCall = vi.fn().mockResolvedValueOnce({ count: null, error: new Error('DB error') })
    const mockSelectCall = vi.fn().mockReturnValueOnce({ eq: mockEqCall })
    mockFrom.mockReturnValueOnce({ select: mockSelectCall })

    const depth = await getReviewQueueDepth()
    expect(depth).toBe(0)
  })
})
