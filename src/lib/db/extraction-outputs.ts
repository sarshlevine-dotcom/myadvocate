import { createClient } from '@/lib/supabase/server'

export async function createExtractionOutput(params: {
  documentId: string
  caseId: string
  userId: string
  confidenceScore: number
  scrubbedPayload: Record<string, unknown>
  flaggedForReview?: boolean
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('extraction_outputs')
    .insert({
      document_id: params.documentId,
      case_id: params.caseId,
      user_id: params.userId,
      confidence_score: params.confidenceScore,
      scrubbed_payload: params.scrubbedPayload,
      flagged_for_review: params.flaggedForReview ?? false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getExtractionOutputByCaseId(caseId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('extraction_outputs')
    .select()
    .eq('case_id', caseId)
    .order('extracted_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
