// App-level domain types derived from DB schema

// ─── MA-SUP-AIR-001 AIR-01: Letter types ─────────────────────────────────────
// Canonical definition lives here so WorkflowContract can reference LetterType
// without a circular import. generate-letter.ts re-exports this for backward compat.
export type LetterType =
  | 'denial_appeal'
  | 'bill_dispute'
  | 'hipaa_request'
  | 'negotiation_script'

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
  | 'lqe_passed'
  | 'lqe_failed'
  | 'gate_7_passed'
  | 'injection_attempt'    // MA-SEC-002 P23: prompt injection detected and quarantined

// Denial code types
export type DenialCodeCategory =
  | 'labs' | 'imaging' | 'surgery' | 'dme' | 'pharmacy'
  | 'mental_health' | 'prior_auth' | 'coordination' | 'timely_filing' | 'other'
  | 'medical_necessity' | 'coverage' | 'billing_error'

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

// ─── MA-SUP-AIR-001 AIR-03: LetterOutputSchema ───────────────────────────────
// Validated shape of a successfully generated letter, returned by validateLetterOutput()
// inside Gate 7 before the disclaimer version check (7a) runs.
// Defense-in-depth: Gate 3 enforces max_tokens upstream; validateLetterOutput() catches
// any overruns that slip through. Zero Anthropic calls.
export interface LetterOutputSchema {
  content:           string      // the generated letter text — must be non-empty
  letterType:        LetterType
  disclaimerAppended: boolean    // true after appendDisclaimer() runs
  promptVersionHash: string      // SHA-256 — must be non-empty
  modelUsed:         string      // model string from MODEL_ROUTER
  tokenCount:        number      // actual output tokens — must be <= OUTPUT_CONFIG[letterType].maxTokens
  lqePassed:         boolean     // true if runLQE() returned passed: true
}

// ─── MA-SUP-AIR-001 AIR-01: WorkflowContract ─────────────────────────────────
// Canonical type describing a valid generateLetter() invocation — inputs, required
// gates, and expected output shape. AIR-03 (LetterOutputSchema) and AIR-04
// (compliance-static.ts) both depend on this type existing first.
export interface WorkflowContract {
  // Identity
  userId: string                        // pre-hashed SHA-256 before LQE
  letterType: LetterType

  // Gate 1 — tier enforcement
  tierAuthRequired: true                // always true; enforced at Gate 1

  // Gate 2 — PII
  piiScrubbed: true                     // set after scrubPII() + verifyScrubbed() pass

  // Gate 3 — output cap
  maxTokens: number                     // must equal OUTPUT_CONFIG[letterType].maxTokens

  // Gate 5 — context firewall
  allowedContextKeys: string[]          // derived from CONTEXT_ALLOWLIST[letterType]

  // Gate 6 — LQE
  lqeRequired: true                     // always true in Phase 2

  // Gate 7 — post-gen integrity
  disclaimerVersionRequired: true
  releaseState: 'review_required'       // Phase 2 lock — never 'released'

  // Output shape (AIR-03: forward reference closed — field typed as LetterOutputSchema interface)
  // Optional: buildWorkflowContract() runs pre-generation; validateLetterOutput() populates this in Gate 7.
  outputSchema?: LetterOutputSchema
}
