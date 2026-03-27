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
 * Approve a pending review queue item.
 * Throws if the item does not currently have decision='pending'.
 */
export async function approveItem(
  reviewQueueId: string,
  reviewerId: string,
): Promise<void> {
  const supabase = await createClient()

  // Verify the item is still pending before approving
  const { data: row, error: selectErr } = await supabase
    .from('review_queue')
    .select('decision')
    .eq('id', reviewQueueId)
    .single()

  if (selectErr) throw selectErr
  if (row.decision !== 'pending') {
    throw new Error(`Cannot approve review_queue item ${reviewQueueId}: not pending (current: ${row.decision})`)
  }

  const { error: updateErr } = await supabase
    .from('review_queue')
    .update({
      decision:    'approved',
      reviewed_at: new Date().toISOString(),
      reviewer_id: reviewerId,
    })
    .eq('id', reviewQueueId)

  if (updateErr) throw updateErr
}

/**
 * Reject a pending review queue item.
 * Requires a non-empty rejection reason (mirrors DB constraint risk_reason_required_on_rejection).
 * Throws if the item does not currently have decision='pending'.
 */
export async function rejectItem(
  reviewQueueId: string,
  reviewerId: string,
  rejectionReason: string,
): Promise<void> {
  if (!rejectionReason?.trim()) {
    throw new Error('Rejection reason is required and cannot be empty')
  }

  const supabase = await createClient()

  // Verify the item is still pending before rejecting
  const { data: row, error: selectErr } = await supabase
    .from('review_queue')
    .select('decision')
    .eq('id', reviewQueueId)
    .single()

  if (selectErr) throw selectErr
  if (row.decision !== 'pending') {
    throw new Error(`Cannot reject review_queue item ${reviewQueueId}: not pending (current: ${row.decision})`)
  }

  const { error: updateErr } = await supabase
    .from('review_queue')
    .update({
      decision:    'rejected',
      reviewed_at: new Date().toISOString(),
      reviewer_id: reviewerId,
      risk_reason: rejectionReason,
    })
    .eq('id', reviewQueueId)

  if (updateErr) throw updateErr
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
