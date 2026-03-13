// src/app/api/generate/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

vi.mock('@/lib/rate-limit', () => ({
  generateRateLimit: { limit: vi.fn().mockResolvedValue({ success: true, remaining: 9 }) },
}))

vi.mock('@/lib/db/cases', () => ({
  getCaseById: vi.fn().mockResolvedValue({ id: 'case-1', user_id: 'user-1' }),
}))

vi.mock('@/lib/generate-letter', () => ({
  generateLetter: vi.fn().mockResolvedValue({ id: 'art-1', content: 'Dear Insurer...' }),
}))

vi.mock('@/lib/db/friction-events', () => ({
  writeFrictionEvent: vi.fn().mockResolvedValue(undefined),
}))

// Queue depth mock
const mockGetReviewQueueDepth = vi.hoisted(() => vi.fn().mockResolvedValue(0))
vi.mock('@/lib/db/review-queue', () => ({
  getReviewQueueDepth: mockGetReviewQueueDepth,
}))

// Capacity alert mock
const mockSendCapacityAlert = vi.hoisted(() => vi.fn().mockResolvedValue(true))
vi.mock('@/lib/mailer', () => ({
  sendCapacityAlert: mockSendCapacityAlert,
}))

// Mock Supabase createClient for subscription check
const mockSingle = vi.hoisted(() => vi.fn().mockResolvedValue({
  data: { subscription_status: 'active', role: 'user' },
  error: null,
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: mockSingle }),
      }),
    }),
  }),
}))

// Mock global fetch for fire-and-forget notify call
const mockFetch = vi.hoisted(() => vi.fn().mockResolvedValue({ ok: true }))
vi.stubGlobal('fetch', mockFetch)

import { POST } from './route'

function makeRequest(body = {}) {
  return new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    body: JSON.stringify({ caseId: 'case-1', caseData: {}, letterType: 'denial_appeal', ...body }),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/generate — queue depth guard (MA-SEC-002 P27)', () => {
  beforeEach(() => {
    mockGetReviewQueueDepth.mockClear()
    mockSendCapacityAlert.mockClear()
    mockFetch.mockClear()
  })

  it('returns 429 with QUEUE_CAP when queue depth is at cap (10)', async () => {
    mockGetReviewQueueDepth.mockResolvedValueOnce(10)
    const res = await POST(makeRequest())
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.code).toBe('QUEUE_CAP')
  })

  it('returns 429 when queue depth exceeds cap (>10)', async () => {
    mockGetReviewQueueDepth.mockResolvedValueOnce(12)
    const res = await POST(makeRequest())
    expect(res.status).toBe(429)
  })

  it('fires capacity alert to Sarsh when at cap', async () => {
    mockGetReviewQueueDepth.mockResolvedValueOnce(10)
    await POST(makeRequest())
    // Allow microtasks to settle so the fire-and-forget can execute
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mockSendCapacityAlert).toHaveBeenCalledTimes(1)
  })

  it('proceeds normally when queue depth is below cap (9)', async () => {
    mockGetReviewQueueDepth.mockResolvedValueOnce(9)
    const res = await POST(makeRequest())
    expect(res.status).toBe(201)
  })

  it('fires notify-review fetch after successful generation', async () => {
    mockGetReviewQueueDepth.mockResolvedValueOnce(0)
    await POST(makeRequest())
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/internal/notify-review'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('does not block letter delivery when notify fetch fails', async () => {
    mockGetReviewQueueDepth.mockResolvedValueOnce(0)
    mockFetch.mockRejectedValueOnce(new Error('network error'))
    const res = await POST(makeRequest())
    expect(res.status).toBe(201)
  })
})
