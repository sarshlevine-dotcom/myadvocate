// MA-AUT-006 §G1: LQE persistence helpers.
// Writes letter quality evaluation results to letter_quality_evaluations table
// (migration 021 + 022). Called by generate-letter.ts after artifact creation.
// Non-blocking — errors are logged but must NEVER halt letter delivery.
//
// NOTE: cast removed once `supabase gen types typescript` is run and
// src/types/supabase.ts is regenerated with the letter_quality_evaluations table.

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { LQEResult } from '@/lib/lqe'
import type { LetterType } from '@/lib/generate-letter'

export interface InsertLQEResultParams {
  artifactId:  string
  caseId:      string
  letterType:  LetterType
  lqeResult:   LQEResult
  userIdHash:  string      // SHA-256 of user UUID — caller's responsibility
  iteration?:  1 | 2      // default 1; iteration 2 = post-Kate re-evaluation
}

export async function insertLQEResult(params: InsertLQEResultParams): Promise<void> {
  const supabase = createServiceRoleClient()
  const { lqeResult } = params
  const iteration = params.iteration ?? 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as unknown as any)
    .from('letter_quality_evaluations')
    .insert({
      artifact_id:          params.artifactId,
      case_id:              params.caseId,
      letter_type:          params.letterType,
      passed:               lqeResult.passed,
      failure_reason:       lqeResult.failureReason ?? null,
      iteration,
      dc_accuracy_passed:   lqeResult.checks.denialCodeAccuracy.passed,
      dc_accuracy_score:    lqeResult.checks.denialCodeAccuracy.score,
      dc_accuracy_notes:    lqeResult.checks.denialCodeAccuracy.notes ?? null,
      ymyl_safety_passed:   lqeResult.checks.ymylSafety.passed,
      ymyl_safety_score:    lqeResult.checks.ymylSafety.score,
      ymyl_safety_notes:    lqeResult.checks.ymylSafety.notes ?? null,
      legal_framing_passed: lqeResult.checks.legalFraming.passed,
      legal_framing_score:  lqeResult.checks.legalFraming.score,
      legal_framing_notes:  lqeResult.checks.legalFraming.notes ?? null,
      user_id_hash:         params.userIdHash,
      escalated_to_review:  !lqeResult.passed,
    })

  if (error) {
    // Non-fatal — log and continue. LQE telemetry loss is acceptable;
    // blocking user delivery is not.
    console.error('[lqe-db] Failed to persist LQE result:', {
      artifactId: params.artifactId,
      caseId:     params.caseId,
      letterType: params.letterType,
      passed:     lqeResult.passed,
      error,
    })
  }
}
