import { createClient } from '@/lib/supabase/server'
import type { SubscriptionStatus } from '@/types/domain'

export async function upsertSubscription(params: {
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: SubscriptionStatus
  currentPeriodEnd: Date
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: params.userId,
        stripe_customer_id: params.stripeCustomerId,
        stripe_subscription_id: params.stripeSubscriptionId,
        status: params.status,
        current_period_end: params.currentPeriodEnd.toISOString(),
      },
      { onConflict: 'stripe_subscription_id' }
    )
  if (error) throw error
}

export async function getSubscriptionByUserId(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select()
    .eq('user_id', userId)
    .single()
  return data
}
