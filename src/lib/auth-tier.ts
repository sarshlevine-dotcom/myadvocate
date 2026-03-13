// src/lib/auth-tier.ts
// MA-SEC-002 P25/P26: Server-side tier authorization gate.
// Called as the first step in every generate route, before generateLetter().
// NEVER call the Anthropic SDK here — auth only.
// ALWAYS use the service role client — never the anon client.

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { TierAuthResult } from '@/types/domain'

// ─── Named limits (never inline magic numbers) ────────────────────────────────
const FREE_TIER_MONTHLY_LIMIT = 1

// All 4 Phase 1 letter types are available on all tiers.
// Update this set when tier-gated features ship.
const PERMITTED_LETTER_TYPES = new Set([
  'denial_appeal',
  'bill_dispute',
  'hipaa_request',
  'negotiation_script',
])

// ─── checkTierAuthorization ───────────────────────────────────────────────────
export async function checkTierAuthorization(
  userId: string,
  letterType: string,
): Promise<TierAuthResult> {
  // Guard: empty userId
  if (!userId) {
    return { authorized: false, reason: 'user_not_found', code: 'AUTH_USER' }
  }

  // Guard: letter type not in permitted set (future-proofing)
  if (!PERMITTED_LETTER_TYPES.has(letterType)) {
    return { authorized: false, reason: 'tier_insufficient', code: 'AUTH_TIER' }
  }

  const supabase = createServiceRoleClient()

  // Step 1: Determine tier from subscriptions table
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single()

  if (subError && subError.code !== 'PGRST116') {
    // PGRST116 = "no rows" — expected for free users with no subscription.
    // Any other error: conservative block (MA-SEC-002 P25).
    return { authorized: false, reason: 'user_not_found', code: 'AUTH_USER' }
  }

  // Step 2a: Paid subscription found
  if (subscription) {
    // Active paid tier — authorized regardless of letter count
    if (subscription.status === 'active') {
      return { authorized: true }
    }
    // Past-due or canceled — subscription tier insufficient
    return { authorized: false, reason: 'tier_insufficient', code: 'AUTH_TIER' }
  }

  // Step 2b: No subscription → free tier — check monthly artifact count
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString()

  const { count, error: countError } = await supabase
    .from('artifacts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth)

  if (countError) {
    // Conservative: can't verify count → block to prevent limit bypass
    return { authorized: false, reason: 'generation_limit_reached', code: 'AUTH_LIMIT' }
  }

  if ((count ?? 0) >= FREE_TIER_MONTHLY_LIMIT) {
    return { authorized: false, reason: 'generation_limit_reached', code: 'AUTH_LIMIT' }
  }

  return { authorized: true }
}
