// src/app/api/internal/notify-review/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Supabase service role client
const mockSingle = vi.hoisted(() => vi.fn())
const mockEq = vi.hoisted(() => vi.fn(() => ({ single: mockSingle })))
const mockSelect = vi.hoisted(() => vi.fn(() => ({ eq: mockEq })))
const mockFrom = vi.hoisted(() => vi.fn(() => ({ select: mockSelect })))

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))

// Mock mailer
vi.mock('@/lib/mailer', () => ({
  sendReviewNotification: vi.fn().mockResolvedValue(true),
}))

import { POST } from './route'
import { sendReviewNotification } from '@/lib/mailer'

const MOCK_ARTIFACT = {
  id: 'art-123',
  artifact_type: 'denial_appeal',
  user_id: 'user-abc',
  created_at: '2026-03-13T12:00:00Z',
  release_state: 'review_required',
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/internal/notify-review', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/internal/notify-review', () => {
  beforeEach(() => {
    vi.mocked(sendReviewNotification).mockClear()
    mockSingle.mockResolvedValue({ data: MOCK_ARTIFACT, error: null })
  })

  it('returns 400 when artifactId is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when artifact not found in DB', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null })
    const res = await POST(makeRequest({ artifactId: 'missing' }))
    expect(res.status).toBe(404)
  })

  it('returns 200 and calls sendReviewNotification on success', async () => {
    const res = await POST(makeRequest({ artifactId: 'art-123' }))
    expect(res.status).toBe(200)
    expect(sendReviewNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'art-123', artifact_type: 'denial_appeal' })
    )
  })

  it('returns 500 when DB query fails', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('db fail') })
    const res = await POST(makeRequest({ artifactId: 'art-123' }))
    expect(res.status).toBe(500)
  })

  it('returns 500 when sendReviewNotification returns false', async () => {
    vi.mocked(sendReviewNotification).mockResolvedValueOnce(false)
    const res = await POST(makeRequest({ artifactId: 'art-123' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})
