import { createClient } from '@/lib/supabase/server'
import type { ArtifactReleaseState } from '@/types/domain'
import type { LetterType } from '@/lib/generate-letter'

export async function createArtifact(params: {
  caseId: string
  userId: string
  artifactType: LetterType
  releaseState: ArtifactReleaseState
  disclaimerVersion: string
  disclaimerHash?: string      // MA-AUT-006 §G6 — pending migration; additive column
  contentHash: string
  storagePath: string
  content: string
  promptVersionHash?: string   // MA-SEC-002 P30 — pending migration; additive column
}) {
  const supabase = await createClient()

  // Upload content to storage
  const { error: uploadError } = await supabase.storage
    .from('artifacts')
    .upload(params.storagePath, params.content, {
      contentType: 'text/plain',
      upsert: false,
    })
  if (uploadError) throw uploadError

  // Create DB record — disclaimer_hash and prompt_version_hash are additive columns
  // pending next migration pass; Supabase will surface an error if columns are absent.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertPayload: Record<string, any> = {
    case_id:            params.caseId,
    user_id:            params.userId,
    artifact_type:      params.artifactType,
    release_state:      params.releaseState,
    disclaimer_version: params.disclaimerVersion,
    content_hash:       params.contentHash,
    storage_path:       params.storagePath,
  }
  if (params.disclaimerHash)    insertPayload.disclaimer_hash    = params.disclaimerHash
  if (params.promptVersionHash) insertPayload.prompt_version_hash = params.promptVersionHash

  const { data, error } = await supabase
    .from('artifacts')
    .insert(insertPayload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getArtifactById(artifactId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artifacts')
    .select()
    .eq('id', artifactId)
    .single()
  if (error) return null
  return data
}

export async function updateArtifactReleaseState(
  artifactId: string,
  releaseState: ArtifactReleaseState
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('artifacts')
    .update({ release_state: releaseState })
    .eq('id', artifactId)
  if (error) throw error
}
