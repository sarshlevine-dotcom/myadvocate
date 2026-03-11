import { createClient } from '@/lib/supabase/server'
import type { IssueType, UsState, CaseStatus } from '@/types/domain'

export async function createCase(params: {
  userId: string
  issueType: IssueType
  state: UsState
  entrySource: 'denial_decoder' | 'direct' | 'seo'
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .insert({
      user_id: params.userId,
      issue_type: params.issueType,
      state: params.state,
      entry_source: params.entrySource,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCaseById(caseId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .select()
    .eq('id', caseId)
    .single()
  if (error) throw error
  return data
}

export async function getCasesByUserId(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cases')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateCaseStatus(caseId: string, status: CaseStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cases')
    .update({ status })
    .eq('id', caseId)
  if (error) throw error
}
