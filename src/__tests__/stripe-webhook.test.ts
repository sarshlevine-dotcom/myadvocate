// src/__tests__/stripe-webhook.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}))

vi.mock('@/lib/db/subscriptions', () => ({
  upsertSubscription: vi.fn(),
}))

vi.mock('@/lib/db/users', () => ({
  updateSubscriptionStatus: vi.fn(),
}))

import { stripe } from '@/lib/stripe'
import { upsertSubscription } from '@/lib/db/subscriptions'
import { updateSubscriptionStatus } from '@/lib/db/users'

describe('Stripe webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'test-secret'
  })

  it('rejects requests with invalid signature', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: 'payload',
      headers: { 'stripe-signature': 'bad-sig' },
    })

    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('processes customer.subscription.updated event', async () => {
    const fakeEvent = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          current_period_end: 1800000000,
          metadata: { userId: 'user-1' },
        },
      },
    }
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(fakeEvent as any)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const req = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify(fakeEvent),
      headers: { 'stripe-signature': 'valid-sig' },
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSubscriptionId: 'sub_123',
        status: 'active',
      })
    )
    expect(updateSubscriptionStatus).toHaveBeenCalledWith('user-1', 'active')
  })
})
