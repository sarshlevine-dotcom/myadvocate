// src/__tests__/per-case-checkout.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  apiRateLimit: {
    limit: vi.fn(),
  },
}))

vi.mock('@/lib/db/metric-events', () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { apiRateLimit } from '@/lib/rate-limit'

const mockUser = { id: 'user-uuid-123' }

function mockAuthAs(user: typeof mockUser | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  } as unknown as ReturnType<typeof createClient>)
}

describe('POST /api/stripe/per-case-checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_PER_CASE_PRICE_ID = 'price_test_123'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    vi.mocked(apiRateLimit.limit).mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      reset: 0,
      pending: Promise.resolve(),
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    mockAuthAs(null)

    const { POST } = await import('@/app/api/stripe/per-case-checkout/route')
    const req = new Request('http://localhost/api/stripe/per-case-checkout', {
      method: 'POST',
      body: JSON.stringify({ caseId: 'case-abc', userId: 'user-uuid-123' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limit is exceeded', async () => {
    mockAuthAs(mockUser)
    vi.mocked(apiRateLimit.limit).mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      reset: 0,
      pending: Promise.resolve(),
    })

    const { POST } = await import('@/app/api/stripe/per-case-checkout/route')
    const req = new Request('http://localhost/api/stripe/per-case-checkout', {
      method: 'POST',
      body: JSON.stringify({ caseId: 'case-abc', userId: 'user-uuid-123' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(429)
  })

  it('returns 400 when caseId is missing', async () => {
    mockAuthAs(mockUser)

    const { POST } = await import('@/app/api/stripe/per-case-checkout/route')
    const req = new Request('http://localhost/api/stripe/per-case-checkout', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-uuid-123' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(400)
  })

  it('creates Stripe checkout session and returns url', async () => {
    mockAuthAs(mockUser)
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: 'https://checkout.stripe.com/session-url',
    } as unknown as Awaited<ReturnType<typeof stripe.checkout.sessions.create>>)

    const { POST } = await import('@/app/api/stripe/per-case-checkout/route')
    const req = new Request('http://localhost/api/stripe/per-case-checkout', {
      method: 'POST',
      body: JSON.stringify({ caseId: 'case-abc', userId: 'user-uuid-123' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://checkout.stripe.com/session-url')
  })

  it('sets payment_intent_data.metadata with userId from session (not body), caseId, productType', async () => {
    mockAuthAs(mockUser)
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      url: 'https://checkout.stripe.com/session-url',
    } as unknown as Awaited<ReturnType<typeof stripe.checkout.sessions.create>>)

    const { POST } = await import('@/app/api/stripe/per-case-checkout/route')
    const req = new Request('http://localhost/api/stripe/per-case-checkout', {
      method: 'POST',
      // body provides a different userId — session userId must take precedence
      body: JSON.stringify({ caseId: 'case-abc', userId: 'attacker-uuid' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req as unknown as import('next/server').NextRequest)
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        payment_intent_data: expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user-uuid-123', // session user, not 'attacker-uuid'
            caseId: 'case-abc',
            productType: 'per_case',
          }),
        }),
      })
    )
  })
})
