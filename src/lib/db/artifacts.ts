import { createClient } from '@/lib/supabase/server'
import type { ArtifactReleaseState } from '@/types/domain'

export async function createArtifact(params: {
  caseId: string
  userId: string
  artifactType: 'denial_appeal'
  releaseState: ArtifactReleaseState
  disclaimerVersion: string
  contentHash: string
  storagePath: string
  content: string
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

  // Create DB record
  const { data, error } = await supabase
    .from('artifacts')
    .insert({
      case_id: params.caseId,
      user_id: params.userId,
      artifact_type: params.artifactType,
      release_state: params.releaseState,
      disclaimer_version: params.disclaimerVersion,
      content_hash: params.contentHash,
      storage_path: params.storagePath,
    })
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
