// src/app/api/generate/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

vi.mock('@/lib/auth-tier', () => ({
  checkTierAuthorization: vi.fn().mockResolvedValue({ authorized: true }),
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

vi.mock('@/lib/db/metric-events', () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tier: 'paid' },
            error: null,
          }),
        }),
      }),
    }),
  }),
}))

import { POST } from './route'

function makeRequest(body = {}) {
  return new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    body: JSON.stringify({ caseId: 'case-1', caseData: {}, letterType: 'denial_appeal', ...body }),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/generate — tier authorization (MA-SEC-002 P25/P26)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    const { getCurrentUser } = await import('@/lib/auth')
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null)
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 403 when tier authorization fails', async () => {
    const { checkTierAuthorization } = await import('@/lib/auth-tier')
    vi.mocked(checkTierAuthorization).mockResolvedValueOnce({
      authorized: false,
      error: 'Free tier limit reached',
    })
    const res = await POST(makeRequest())
    expect(res.status).toBe(403)
  })

  it('logs authorization failure for abuse monitoring (P26)', async () => {
    const { checkTierAuthorization } = await import('@/lib/auth-tier')
    const { logEvent } = await import('@/lib/db/metric-events')
    vi.mocked(checkTierAuthorization).mockResolvedValueOnce({
      authorized: false,
      error: 'Free tier limit reached',
    })
    await POST(makeRequest())
    expect(vi.mocked(logEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'tool_use',
        sourcePage: '/api/generate',
        userId: 'user-1',
      })
    )
  })

  it('returns 429 when rate limit exceeded', async () => {
    const { generateRateLimit } = await import('@/lib/rate-limit')
    vi.mocked(generateRateLimit.limit).mockResolvedValueOnce({ success: false, remaining: 0 })
    const res = await POST(makeRequest())
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({
      error: 'Daily limit reached. Try again tomorrow.',
    })
  })

  it('returns 404 when case not found', async () => {
    const { getCaseById } = await import('@/lib/db/cases')
    vi.mocked(getCaseById).mockResolvedValueOnce(null)
    const res = await POST(makeRequest())
    expect(res.status).toBe(404)
  })

  it('returns 404 when user does not own the case', async () => {
    const { getCaseById } = await import('@/lib/db/cases')
    vi.mocked(getCaseById).mockResolvedValueOnce({
      id: 'case-1',
      user_id: 'different-user',
    })
    const res = await POST(makeRequest())
    expect(res.status).toBe(404)
  })

  it('generates letter and returns 201 on success', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.artifactId).toBe('art-1')
    expect(body.caseId).toBe('case-1')
    expect(body.content).toBe('Dear Insurer...')
  })

  it('writes friction event for denial_appeal', async () => {
    const { writeFrictionEvent } = await import('@/lib/db/friction-events')
    await POST(makeRequest({ letterType: 'denial_appeal' }))
    expect(vi.mocked(writeFrictionEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_used: 'appeal_letter',
        case_id: 'case-1',
      })
    )
  })

  it('writes friction event for bill_dispute', async () => {
    const { writeFrictionEvent } = await import('@/lib/db/friction-events')
    await POST(makeRequest({ letterType: 'bill_dispute', caseData: { billing_error_type: 'wrong_amount' } }))
    expect(vi.mocked(writeFrictionEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_used: 'bill_dispute',
        case_id: 'case-1',
      })
    )
  })
})
