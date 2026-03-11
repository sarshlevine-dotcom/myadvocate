// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { upsertSubscription } from '@/lib/db/subscriptions'
import { updateSubscriptionStatus } from '@/lib/db/users'
import type Stripe from 'stripe'

// MA-SEC-002 P17: ALWAYS verify Stripe signature before processing any event
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    // Invalid signature — reject immediately
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

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
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      })

      await updateSubscriptionStatus(
        userId,
        subscription.status === 'active' ? 'active' : 'canceled'
      )
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata.userId
    if (userId) {
      await updateSubscriptionStatus(userId, 'canceled')
    }
  }

  return NextResponse.json({ received: true })
}
