// src/app/api/stripe/per-case-checkout/route.ts
// MA-SEC-002 P16: Requires authenticated user
// MA-SEC-002 P15: Rate limited via apiRateLimit
// MA-SEC-002 P13: userId sourced from Supabase auth session — never from request body
// MA-COST-001: Not an AI call — no bucket classification needed
// PMP v19 §8 metric 2: per_case_checkout telemetry fires on initiation

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { apiRateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/db/metric-events'

export async function POST(request: NextRequest) {
  // MA-SEC-002 P16: Auth required — reject unauthenticated requests
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // MA-SEC-002 P15: Rate limit per authenticated user
  const { success } = await apiRateLimit.limit(user.id)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { caseId } = await request.json()
  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
  }

  // Validate that userId (from auth) and priceId (from env) are non-empty strings
  if (!user.id || typeof user.id !== 'string') {
    return NextResponse.json({ error: 'Invalid user session' }, { status: 400 })
  }
  const priceId = process.env.STRIPE_PER_CASE_PRICE_ID
  if (!priceId || priceId.trim() === '') {
    return NextResponse.json({ error: 'Per-case product not configured' }, { status: 500 })
  }

  // PMP v19 §8 metric 2 — per_case_checkout telemetry (non-blocking)
  logEvent({
    eventType: 'per_case_checkout',
    sourcePage: '/api/stripe/per-case-checkout',
    // MA-SEC-002 P13: userId = Supabase auth UUID only
    userId: user.id,
  }).catch(() => {})

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // MA-SEC-002 P13: metadata uses session userId — not the request body userId
      // The payment_intent.succeeded webhook reads these to fire per_case_purchased
      payment_intent_data: {
        metadata: {
          userId: user.id,
          caseId,
          productType: 'per_case',
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/cases/${caseId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cases/${caseId}?payment=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/per-case-checkout] Stripe API error:', err)
    return NextResponse.json({ error: 'Payment service unavailable. Please try again.' }, { status: 503 })
  }
}
