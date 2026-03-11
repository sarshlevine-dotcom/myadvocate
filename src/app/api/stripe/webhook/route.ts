// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { upsertSubscription } from '@/lib/db/subscriptions'
import { updateSubscriptionStatus } from '@/lib/db/users'
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
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        })

        await updateSubscriptionStatus(
          userId,
          subscription.status === 'active' ? 'active' : 'canceled'
        )
      } else {
        console.error('Stripe webhook: missing userId in subscription metadata', { type: event.type, subscriptionId: (event.data.object as Stripe.Subscription).id })
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata.userId
      if (userId) {
        await updateSubscriptionStatus(userId, 'canceled')
      } else {
        console.error('Stripe webhook: missing userId in subscription metadata', { type: event.type, subscriptionId: (event.data.object as Stripe.Subscription).id })
      }
    }
  } catch (err) {
    console.error('Stripe webhook: error processing event', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
