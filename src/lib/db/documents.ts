import { createClient } from '@/lib/supabase/server'
import type { DocumentParseStatus } from '@/types/domain'

export async function createDocument(params: {
  caseId: string
  fileType: 'pdf' | 'jpg' | 'png'
  storagePath: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('documents')
    .insert({
      case_id: params.caseId,
      file_type: params.fileType,
      storage_path: params.storagePath,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getDocumentById(documentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('documents')
    .select()
    .eq('id', documentId)
    .single()
  if (error) return null
  return data
}

export async function getDocumentsByCaseId(caseId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('documents')
    .select()
    .eq('case_id', caseId)
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateDocumentParseStatus(
  documentId: string,
  status: DocumentParseStatus,
  confidence?: number
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('documents')
    .update({
      parse_status: status,
      ...(confidence !== undefined && { extraction_confidence: confidence }),
    })
    .eq('id', documentId)
  if (error) throw error
}
