import { createClient } from '@/lib/supabase/server'
import type { ReviewDecision } from '@/types/domain'

export async function addToReviewQueue(params: {
  artifactId: string
  caseId: string
  riskReason: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('review_queue')
    .insert({
      artifact_id: params.artifactId,
      case_id: params.caseId,
      risk_reason: params.riskReason,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPendingReviews() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('review_queue')
    .select('*, artifacts(artifact_type, release_state)')
    .eq('decision', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function updateReviewDecision(params: {
  reviewQueueId: string
  decision: Exclude<ReviewDecision, 'pending'>
  reviewerId: string
  riskReason?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('review_queue')
    .update({
      decision: params.decision,
      reviewed_at: new Date().toISOString(),
      reviewer_id: params.reviewerId,
      ...(params.riskReason && { risk_reason: params.riskReason }),
    })
    .eq('id', params.reviewQueueId)
  if (error) throw error
}

/**
 * Insert a review queue item for LQE failures (MA-AUT-006 §G1).
 * Encodes the failure reason and letter type into risk_reason so Kate
 * can triage without schema changes.
 */
export async function insertReviewQueueItem(params: {
  artifactId:    string
  caseId:        string
  failureReason: string
  letterType:    string
  userId:        string  // SHA-256 hashed — never raw UUID
}) {
  const supabase = await createClient()
  const riskReason = `LQE_FAILED:${params.failureReason} [${params.letterType}] uid:${params.userId.slice(0, 8)}`
  const { data, error } = await supabase
    .from('review_queue')
    .insert({
      artifact_id: params.artifactId,
      case_id:     params.caseId,
      risk_reason: riskReason,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Returns the number of artifacts currently pending review.
 * MA-SEC-002 P27: Used to enforce the 10-artifact queue cap.
 * Returns 0 on error (safe default — prevents false capacity blocks).
 */
export async function getReviewQueueDepth(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('review_queue')
    .select('id', { count: 'exact', head: true })
    .eq('decision', 'pending')
  if (error) {
    console.error('[review-queue] getReviewQueueDepth failed:', error)
    return 0
  }
  return count ?? 0
}
