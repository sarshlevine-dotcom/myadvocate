// src/__tests__/stripe-webhook.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all external dependencies before importing the route
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}))

vi.mock('@/lib/db/metric-events', () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/db/subscriptions', () => ({
  upsertSubscription: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/db/users', () => ({
  updateSubscriptionStatus: vi.fn().mockResolvedValue(undefined),
}))

import { stripe } from '@/lib/stripe'
import { logEvent } from '@/lib/db/metric-events'
import type { NextRequest } from 'next/server'

// Helper: create a minimal NextRequest-like object for the webhook
function makeWebhookRequest(body: string, signature: string | null): NextRequest {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (signature !== null) headers.set('stripe-signature', signature)
  return {
    text: async () => body,
    headers,
  } as unknown as NextRequest
}

// Helper: create a minimal Stripe event object
function makeStripeEvent(type: string, dataObject: Record<string, unknown> = {}) {
  return { type, data: { object: dataObject } }
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
  })

  // Test 1: Valid signature → 200
  it('returns 200 when signature is valid', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('payment_intent.succeeded', {
        id: 'pi_123',
        metadata: {},
        amount: 1300,
      }) as ReturnType<typeof stripe.webhooks.constructEvent>
    )

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest('{}', 't=123,v1=abc')
    const res = await POST(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ received: true })
  })

  // Test 2: Invalid signature → 400
  it('returns 400 when signature is invalid', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest('{}', 'bad-signature')
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid signature')
  })

  // Test 3: checkout.session.completed → logEvent called with 'conversion'
  it('calls logEvent with conversion when checkout.session.completed fires for a subscription', async () => {
    const userId = 'user-abc'
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('checkout.session.completed', {
        id: 'cs_123',
        mode: 'subscription',
        metadata: { userId },
        client_reference_id: null,
      }) as ReturnType<typeof stripe.webhooks.constructEvent>
    )

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest('{}', 't=123,v1=abc')
    await POST(req)

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'conversion',
        sourcePage: '/api/stripe/webhook',
        userId,
      })
    )
  })

  // Test 4: checkout.session.completed with mode=payment → logEvent NOT called
  it('does NOT call logEvent for checkout.session.completed with mode=payment', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('checkout.session.completed', {
        id: 'cs_456',
        mode: 'payment',
        metadata: {},
        client_reference_id: null,
      }) as ReturnType<typeof stripe.webhooks.constructEvent>
    )

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest('{}', 't=123,v1=abc')
    await POST(req)

    expect(logEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'conversion' })
    )
  })

  // Test 5: Unknown/unhandled event type → 200, no crash
  it('returns 200 and does not crash for an unhandled event type', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('invoice.payment_succeeded', { id: 'in_123' }) as ReturnType<typeof stripe.webhooks.constructEvent>
    )

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest('{}', 't=123,v1=abc')
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(logEvent).not.toHaveBeenCalled()
  })

  // Test 6: Missing stripe-signature header → 400
  it('returns 400 when stripe-signature header is missing', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = makeWebhookRequest('{}', null)
    const res = await POST(req)

    expect(res.status).toBe(400)
  })
})
