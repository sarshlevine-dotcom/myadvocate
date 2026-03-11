import { createClient } from '@/lib/supabase/server'
import type { IssueType, UsState } from '@/types/domain'

export async function getResourcesByStateAndIssue(
  state: UsState,
  issueType: IssueType
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resource_routes')
    .select()
    .eq('state_code', state)
    .eq('issue_type', issueType)
    .eq('is_active', true)
    .order('resource_name')
  if (error) throw error
  return data ?? []
}
