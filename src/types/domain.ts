// App-level domain types derived from DB schema

// MA-COST-001: Model tier — Haiku is default workhorse; Sonnet only for complex/document cases
export type ModelTier = 'haiku' | 'sonnet'

export type IssueType = 'denial' | 'billing' | 'access'
export type UsState = 'CA' | 'TX' | 'NY'
export type CaseStatus = 'open' | 'in_progress' | 'completed' | 'archived'
export type ArtifactReleaseState = 'draft' | 'review_required' | 'released' | 'archived'
export type ReviewDecision = 'pending' | 'approved' | 'rejected' | 'edited'
export type DocumentParseStatus = 'pending' | 'parsed' | 'failed' | 'unsupported'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due'
export type EventType =
  | 'tool_use'
  | 'page_view'
  | 'signup'
  | 'conversion'
  | 'letter_generated'
  | 'per_case_checkout'
  | 'per_case_purchased'
  | 'subscription_started'
  | 'second_tool_use'
  | 'gate_failure'

// Denial code types
export type DenialCodeCategory =
  | 'labs' | 'imaging' | 'surgery' | 'dme' | 'pharmacy'
  | 'mental_health' | 'prior_auth' | 'coordination' | 'timely_filing' | 'other'

export type ToolCtaId =
  | 'denial_decoder' | 'appeal_generator' | 'bill_dispute' | 'hipaa_request'

export interface DenialCode {
  id: string
  code: string
  category: DenialCodeCategory
  plain_language_explanation: string
  recommended_action: string
  source: string
  updated_at: string
  common_causes: string | null
  appeal_angle: string | null
  related_codes: string[] | null
  tool_cta_id: ToolCtaId | null
}

// ─── MA-EEAT-001: Content review types ───────────────────────────────────────

// Content tier — matches content_audit_log.content_tier constraint
export type ContentTier = 1 | 2 | 3

// Review method — matches content_audit_log.review_method constraint
export type ReviewMethod = 'checklist' | 'editorial' | 'attorney'

// Result from the 5-layer EEAT validator (MA-EEAT-001 §8.1)
export interface EEATValidationResult {
  pass: boolean                   // true only if ALL five layers pass
  layers: {
    schema:     { pass: boolean; errors: string[] }
    citations:  { pass: boolean; errors: string[] }
    claims:     { pass: boolean; errors: string[] }
    disclaimer: { pass: boolean; errors: string[] }
    tier:       { pass: boolean; errors: string[]; escalatedTo?: ContentTier }
  }
}

// Content page schema — mandatory fields enforced by EEAT validator
export interface ContentPageSchema {
  title:                      string
  meta_description:           string
  content_tier:               ContentTier
  target_problem:             string
  cluster:                    string
  primary_source_1:           string        // URL — must be on approved domain list
  primary_source_2:           string        // URL — must be on approved domain list
  reviewer_name:              string        // always: 'MyAdvocate Clinical Review Team'
  review_date:                string        // ISO date
  last_updated_date:          string        // ISO date
  medical_disclaimer_included: boolean
  forbidden_claims_check:     'PASS' | 'FAIL' | 'PENDING'
  attorney_review_required:   boolean
  publish_approved_by:        string
  body:                       string        // full page content — checked by claims + disclaimer gates
}

// ─── State machine transitions ────────────────────────────────────────────────

// State machine transitions
export const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  open: ['in_progress', 'archived'],
  in_progress: ['completed', 'archived'],
  completed: ['archived'],
  archived: [],
}

export const ARTIFACT_TRANSITIONS: Record<ArtifactReleaseState, ArtifactReleaseState[]> = {
  draft: ['review_required', 'archived'],
  review_required: ['released', 'archived'],
  released: ['archived'],
  archived: [],
}

// ─── MA-SEC-002 P25/P26: Tier authorization result ───────────────────────────

export type TierAuthCode = 'AUTH_LIMIT' | 'AUTH_TIER' | 'AUTH_USER'

export type TierAuthResult =
  | { authorized: true }
  | { authorized: false; reason: 'generation_limit_reached'; code: 'AUTH_LIMIT' }
  | { authorized: false; reason: 'tier_insufficient';        code: 'AUTH_TIER' }
  | { authorized: false; reason: 'user_not_found';           code: 'AUTH_USER' }
