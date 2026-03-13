import { createClient } from '@/lib/supabase/server'

// MA-SUP-DAT-001: tool_used values must match the friction_events table CHECK constraint
type FrictionToolUsed =
  | 'denial_decoder'
  | 'appeal_letter'
  | 'bill_dispute'
  | 'resource_connector'
  | 'prior_auth'

// MA-SEC-002: NO PII fields — no name, email, DOB, member ID, policy number,
// diagnosis codes, or provider names. All fields are bounded and categorical.
export interface FrictionEventPayload {
  // REQUIRED
  tool_used: FrictionToolUsed

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
  // Nurse co-founder review of prompt language required before Phase 2 deployment
  claim_amount_range?: string | null

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
