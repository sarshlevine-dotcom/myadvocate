import { createClient } from '@/lib/supabase/server'

export async function getDenialCodeByCode(code: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('denial_codes')
    .select()
    .eq('code', code.toUpperCase())
    .single()
  if (error) return null
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
