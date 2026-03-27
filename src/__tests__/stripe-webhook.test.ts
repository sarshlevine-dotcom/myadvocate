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
import { updateSubscriptionStatus } from '@/lib/db/users'
import { POST } from '@/app/api/stripe/webhook/route'
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
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
  })

  it('returns 200 when signature is valid', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('payment_intent.succeeded', {
        id: 'pi_123',
        metadata: {},
        amount: 1300,
      }) as ReturnType<typeof stripe.webhooks.constructEvent>
    )

    const req = makeWebhookRequest('{}', 't=123,v1=abc')
    const res = await POST(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ received: true })
    expect(logEvent).not.toHaveBeenCalled()
  })

  it('returns 400 when signature is invalid', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })

    const req = makeWebhookRequest('{}', 'bad-signature')
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid signature')
  })

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

  it('does NOT call logEvent for checkout.session.completed with mode=payment', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('checkout.session.completed', {
        id: 'cs_456',
        mode: 'payment',
        metadata: {},
        client_reference_id: null,
      }) as ReturnType<typeof stripe.webhooks.constructEvent>
    )

    const req = makeWebhookRequest('{}', 't=123,v1=abc')
    const res = await POST(req)

    expect(logEvent).not.toHaveBeenCalled()
    expect(res.status).toBe(200)
  })

  it('returns 200 and does not crash for an unhandled event type', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('invoice.payment_succeeded', { id: 'in_123' }) as ReturnType<typeof stripe.webhooks.constructEvent>
    )

    const req = makeWebhookRequest('{}', 't=123,v1=abc')
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(logEvent).not.toHaveBeenCalled()
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = makeWebhookRequest('{}', null)
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('No signature')
  })

  it('returns 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const req = makeWebhookRequest('{}', 'sig')
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Webhook secret not configured')
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret' // restore
  })

  it('calls logEvent with subscription_started when customer.subscription.created fires with active status', async () => {
    const userId = 'user-uuid-123'
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('customer.subscription.created', {
        id: 'sub_123',
        status: 'active',
        customer: 'cus_123',
        metadata: { userId },
        items: { data: [{ price: { unit_amount: 1999 } }] },
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
      }) as ReturnType<typeof stripe.webhooks.constructEvent>
    )

    const req = makeWebhookRequest('{}', 't=123,v1=abc')
    await POST(req)

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'subscription_started',
        sourcePage: '/api/stripe/webhook',
        userId,
      })
    )
  })

  it('calls updateSubscriptionStatus with canceled when customer.subscription.deleted fires', async () => {
    const userId = 'user-uuid-456'
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      makeStripeEvent('customer.subscription.deleted', {
        id: 'sub_456',
        status: 'canceled',
        customer: 'cus_456',
        metadata: { userId },
        items: { data: [{ price: { unit_amount: 1999 } }] },
        current_period_end: Math.floor(Date.now() / 1000) - 86400,
      }) as ReturnType<typeof stripe.webhooks.constructEvent>
    )

    const req = makeWebhookRequest('{}', 't=123,v1=abc')
    await POST(req)

    expect(updateSubscriptionStatus).toHaveBeenCalledWith(userId, 'canceled')
  })
})
