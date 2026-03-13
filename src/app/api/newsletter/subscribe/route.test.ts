import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  apiRateLimit: {
    limit: vi.fn(),
  },
}))

import { POST } from './route'
import { apiRateLimit } from '@/lib/rate-limit'
import { NextRequest } from 'next/server'

const mockFetch = vi.fn()

// Full Upstash shape — matches pattern in per-case-checkout.test.ts
const RATE_OK = { success: true, limit: 30, remaining: 29, reset: 0, pending: Promise.resolve() } as unknown as Awaited<ReturnType<typeof apiRateLimit.limit>>
const RATE_BLOCKED = { success: false, limit: 30, remaining: 0, reset: 0, pending: Promise.resolve() } as unknown as Awaited<ReturnType<typeof apiRateLimit.limit>>

function makeRequest(body: unknown, ip = '127.0.0.1') {
  return new NextRequest('http://localhost/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/newsletter/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    process.env.BEEHIIV_API_KEY = 'test-key'
    process.env.BEEHIIV_PUBLICATION_ID = 'pub_test'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.BEEHIIV_API_KEY
    delete process.env.BEEHIIV_PUBLICATION_ID
  })

  it('returns 400 on missing email', async () => {
    vi.mocked(apiRateLimit.limit).mockResolvedValue(RATE_OK)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid email')
  })

  it('returns 400 on malformed email', async () => {
    vi.mocked(apiRateLimit.limit).mockResolvedValue(RATE_OK)
    const res = await POST(makeRequest({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(apiRateLimit.limit).mockResolvedValue(RATE_BLOCKED)
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(429)
  })

  it('returns 500 when env vars are missing', async () => {
    vi.mocked(apiRateLimit.limit).mockResolvedValue(RATE_OK)
    delete process.env.BEEHIIV_API_KEY
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })

  it('returns 200 on success', async () => {
    vi.mocked(apiRateLimit.limit).mockResolvedValue(RATE_OK)
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 201 }))
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.beehiiv.com/v2/publications/pub_test/subscriptions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          reactivate_existing: true,
          send_welcome_email: true,
        }),
      })
    )
  })

  it('returns 500 when Beehiiv returns non-2xx', async () => {
    vi.mocked(apiRateLimit.limit).mockResolvedValue(RATE_OK)
    mockFetch.mockResolvedValue(new Response('error', { status: 500 }))
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })
})
