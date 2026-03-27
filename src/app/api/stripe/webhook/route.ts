// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { upsertSubscription } from '@/lib/db/subscriptions'
import { updateSubscriptionStatus } from '@/lib/db/users'
import { logEvent } from '@/lib/db/metric-events'
import type Stripe from 'stripe'

// MA-SEC-002 P17: ALWAYS verify Stripe signature before processing any event
export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch {
    // Invalid signature — reject immediately
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    // Handle subscription lifecycle events
    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.created'
    ) {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata.userId

      if (userId) {
        await upsertSubscription({
          userId,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status === 'active' ? 'active' : 'canceled',
          currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
        })

        await updateSubscriptionStatus(
          userId,
          subscription.status === 'active' ? 'active' : 'canceled'
        )

        // PMP v19 §8 metric 4 — subscription_started (non-blocking)
        if (event.type === 'customer.subscription.created' && subscription.status === 'active') {
          // amount_cents: use plan amount if available (items[0].price.unit_amount)
          const planAmount = subscription.items?.data?.[0]?.price?.unit_amount ?? null
          logEvent({
            eventType: 'subscription_started',
            sourcePage: '/api/stripe/webhook',
            userId,
            subscriptionId: subscription.id,
            amountCents: planAmount ?? undefined,
          }).catch(() => {})
        }
      } else {
        console.error('[stripe/webhook] missing userId in subscription metadata', { type: event.type, subscriptionId: (event.data.object as Stripe.Subscription).id })
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata.userId
      if (userId) {
        await updateSubscriptionStatus(userId, 'canceled')
      } else {
        console.error('[stripe/webhook] missing userId in subscription metadata', { type: event.type, subscriptionId: (event.data.object as Stripe.Subscription).id })
      }
    }

    // PMP v19 §8 metric 3 — per_case_purchased (non-blocking)
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const userId = paymentIntent.metadata?.userId
      const isPerCase = paymentIntent.metadata?.productType === 'per_case'
      if (userId && isPerCase) {
        logEvent({
          eventType: 'per_case_purchased',
          sourcePage: '/api/stripe/webhook',
          userId,
          amountCents: paymentIntent.amount,
        }).catch(() => {})
      }
    }

    // Only log 'conversion' for subscription checkouts — per-case purchases are already
    // tracked via 'per_case_checkout' + 'per_case_purchased' and must not be double-counted.
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription') {
        const userId = session.metadata?.userId ?? session.client_reference_id ?? null
        logEvent({
          eventType: 'conversion',
          sourcePage: '/api/stripe/webhook',
          userId: userId ?? undefined,
        }).catch(() => {})
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const userId = paymentIntent.metadata?.userId
      console.error('[stripe/webhook] payment_intent.payment_failed', {
        paymentIntentId: paymentIntent.id,
        userId: userId ?? 'unknown',
        lastError: paymentIntent.last_payment_error?.message ?? null,
      })
      // No logEvent — no suitable EventType for payment failures
    }
  } catch (err) {
    // Log error but always return 200 — Stripe retries on non-2xx, causing double-processing
    console.error('[stripe/webhook] error processing event', { type: event.type, err })
  }

  return NextResponse.json({ received: true })
}
