import { createClient } from '@/lib/supabase/server'

// MA-SUP-DAT-001: tool_used values must match the friction_events table CHECK constraint
type FrictionToolUsed =
  | 'denial_decoder'
  | 'appeal_letter'
  | 'bill_dispute'
  | 'resource_connector'
  | 'prior_auth'

// MA-DAT-ENG-P1-006: claim_amount_range values per migration 020
export type ClaimAmountRange = 'under_500' | '500_2000' | '2000_10000' | 'over_10000'

// MA-SEC-002: NO PII fields — no name, email, DOB, member ID, policy number,
// diagnosis codes, or provider names. All fields are bounded and categorical.
export interface FrictionEventPayload {
  // REQUIRED
  tool_used: FrictionToolUsed

  // Internal reference — never exposed in analytics (see migration 019)
  case_id?: string | null

  // Denial Decoder / Appeal Letter fields
  denial_code?: string | null
  insurer?: string | null
  service_category?: string | null
  procedure_type?: string | null
  state?: string | null

  // Bill Dispute fields
  billing_error_type?: string | null
  provider_category?: string | null
  charge_amount_range?: string | null
  insurance_status?: string | null

  // Resource Connector fields
  escalation_type?: string | null

  // Financial impact — optional range bucket (see MA-SUP-DAT-001 §2D)
  // MA-DAT-ENG-P1-006: nurse co-founder approved prompt language 2026-03-13
  claim_amount_range?: ClaimAmountRange | null

  // Phase 2 outcome fields — nullable, populated via follow-up flow
  appeal_outcome?: string | null
  days_to_resolution?: number | null
  follow_up_required?: boolean | null
}

// MA-COST-001: Bucket 1 — friction event write, no AI call
export async function writeFrictionEvent(payload: FrictionEventPayload): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('friction_events').insert({
      tool_used:           payload.tool_used,
      case_id:             payload.case_id             ?? null,
      denial_code:         payload.denial_code         ?? null,
      insurer:             payload.insurer             ?? null,
      service_category:    payload.service_category    ?? null,
      procedure_type:      payload.procedure_type      ?? null,
      state:               payload.state               ?? null,
      billing_error_type:  payload.billing_error_type  ?? null,
      provider_category:   payload.provider_category   ?? null,
      charge_amount_range: payload.charge_amount_range ?? null,
      insurance_status:    payload.insurance_status    ?? null,
      escalation_type:     payload.escalation_type     ?? null,
      claim_amount_range:  payload.claim_amount_range  ?? null,
      appeal_outcome:      payload.appeal_outcome      ?? null,
      days_to_resolution:  payload.days_to_resolution  ?? null,
      follow_up_required:  payload.follow_up_required  ?? null,
    })
  } catch {
    // Friction events must never break user flow — log silently
  }
}

// MA-COST-001: Bucket 1 — friction event update, no AI call
// MA-DAT-ENG-P1-006: called by ClaimAmountSelector after user selects a range
export async function updateFrictionEventClaimAmount(
  caseId: string,
  claimAmountRange: ClaimAmountRange | null
): Promise<void> {
  try {
    const supabase = await createClient()
    // Update all friction events for this case with the selected range.
    // case_id is internal only — never exposed in analytics.
    // Multiple events per case are rare but acceptable to update together.
    await supabase
      .from('friction_events')
      .update({ claim_amount_range: claimAmountRange })
      .eq('case_id', caseId)
  } catch {
    // Friction events must never break user flow — log silently
  }
}
