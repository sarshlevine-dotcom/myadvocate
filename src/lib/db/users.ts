import { createClient } from '@/lib/supabase/server'
import type { SubscriptionStatus } from '@/types/domain'

export async function getUserById(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select()
    .eq('id', userId)
    .single()
  return data
}

export async function updateSubscriptionStatus(
  userId: string,
  status: SubscriptionStatus | 'free'
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('users')
    .update({ subscription_status: status })
    .eq('id', userId)
  if (error) throw error
}
