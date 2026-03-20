// MA-SEC-002 P18: Stripe secret key is server-only — never expose to client
import Stripe from 'stripe'

// Lazy proxy — Stripe constructor validates apiKey and throws on empty string.
// Proxy defers instantiation to first property access so next build never
// triggers the constructor during page-data collection.
let _stripe: Stripe | null = null

function getStripeInstance(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    })
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop: string | symbol) {
    return getStripeInstance()[prop as keyof Stripe]
  },
})

export const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY!,
} as const
