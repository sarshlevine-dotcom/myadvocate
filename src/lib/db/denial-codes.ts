import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCache, setCache } from '@/lib/redis'
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache-keys'

export async function getDenialCodeByCode(code: string) {
  const normalizedCode = code.toUpperCase()
  const cacheKey = CACHE_KEYS.denialCode(normalizedCode)

  // L1 cache: check Redis first
  const cached = await getCache(cacheKey)
  if (cached !== null && typeof cached === 'object') return cached

  // Cache miss: fetch from DB
  // Use service role client: denial_codes is static reference data readable by everyone
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('denial_codes')
    .select()
    .eq('code', normalizedCode)
    .single()
  if (error) return null

  // Fire-and-forget: Redis write failure must never block the DB response path.
  setCache(cacheKey, data, CACHE_TTL.STATIC).catch(() => {})

  return data
}

export async function getAllDenialCodes() {
  // Use service role client: denial_codes is static reference data readable by everyone
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('denial_codes')
    .select()
    .order('code')
  if (error) throw error
  return data ?? []
}

export async function getRelatedDenialCodes(codes: string[]) {
  if (codes.length === 0) return []
  // Use service role client: denial_codes is static reference data readable by everyone
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('denial_codes')
    .select()
    .in('code', codes.map((c) => c.toUpperCase()))
    .order('code')
  if (error) throw error
  return data ?? []
}
