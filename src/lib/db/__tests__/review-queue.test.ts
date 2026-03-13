// src/lib/db/__tests__/review-queue.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mock setup — must be before imports
const mockEq = vi.hoisted(() => vi.fn())
const mockSelect = vi.hoisted(() => vi.fn())
const mockFrom = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

import { getReviewQueueDepth } from '@/lib/db/review-queue'

describe('getReviewQueueDepth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEq.mockResolvedValue({ count: 3, error: null })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  it('returns the count of pending review queue items', async () => {
    mockEq.mockResolvedValueOnce({ count: 7, error: null })
    const depth = await getReviewQueueDepth()
    expect(depth).toBe(7)
  })

  it('queries review_queue for pending decision', async () => {
    mockEq.mockResolvedValueOnce({ count: 2, error: null })
    await getReviewQueueDepth()
    expect(mockFrom).toHaveBeenCalledWith('review_queue')
    expect(mockEq).toHaveBeenCalledWith('decision', 'pending')
  })

  it('returns 0 on Supabase error (safe default)', async () => {
    mockEq.mockResolvedValueOnce({ count: null, error: new Error('db error') })
    const depth = await getReviewQueueDepth()
    expect(depth).toBe(0)
  })
})
