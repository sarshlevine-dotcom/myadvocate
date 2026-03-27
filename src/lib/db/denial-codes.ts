import { createClient } from '@/lib/supabase/server'
import { getCache, setCache } from '@/lib/redis'
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache-keys'

export async function getDenialCodeByCode(code: string) {
  const cacheKey = CACHE_KEYS.denialCode(code)

  // L1 cache: check Redis first
  const cached = await getCache(cacheKey)
  if (cached !== null) return cached

  // Cache miss: fetch from DB
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('denial_codes')
    .select()
    .eq('code', code.toUpperCase())
    .single()
  if (error) return null

  // Write back to cache (non-blocking — never awaited on failure path)
  setCache(cacheKey, data, CACHE_TTL.DYNAMIC).catch(() => {})

  return data
}

export async function getAllDenialCodes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('denial_codes')
    .select()
    .order('code')
  if (error) throw error
  return data ?? []
}

export async function getRelatedDenialCodes(codes: string[]) {
  if (codes.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('denial_codes')
    .select()
    .in('code', codes.map((c) => c.toUpperCase()))
    .order('code')
  if (error) throw error
  return data ?? []
}
