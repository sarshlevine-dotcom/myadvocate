// MA-SEC-002 P18: Stripe secret key is server-only — never expose to client
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
})

export const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY!,
} as const
