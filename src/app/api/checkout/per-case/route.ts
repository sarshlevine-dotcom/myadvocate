// src/app/api/checkout/per-case/route.ts
// PMP v19 §8 metric 2 — per_case_checkout fires here when user initiates $13 purchase
//
// TODO: Wire full Stripe Checkout Session creation once the $13 per-case
//       product is configured in Stripe (product ID → env var STRIPE_PER_CASE_PRICE_ID).
//       Steps:
//         1. Create product in Stripe dashboard, copy the Price ID
//         2. Add STRIPE_PER_CASE_PRICE_ID to .env
//         3. Replace stub below with stripe.checkout.sessions.create(...)
//         4. Add metadata: { userId, productType: 'per_case' } so the
//            payment_intent.succeeded webhook can fire per_case_purchased

import { NextResponse } from 'next/server'
import { logEvent } from '@/lib/db/metric-events'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fire per_case_checkout telemetry — non-blocking (PMP v19 §8 metric 2)
  logEvent({
    eventType: 'per_case_checkout',
    sourcePage: '/api/checkout/per-case',
    userId: user?.id,
  }).catch(() => {})

  // TODO: Replace with real Stripe Checkout Session creation
  // const session = await stripe.checkout.sessions.create({ ... })
  // return NextResponse.json({ url: session.url })
  return NextResponse.json(
    { error: 'Per-case Stripe product not yet configured. See TODO in this file.' },
    { status: 501 }
  )
}
