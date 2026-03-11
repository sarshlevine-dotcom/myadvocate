// App-level domain types derived from DB schema

export type IssueType = 'denial' | 'billing' | 'access'
export type UsState = 'CA' | 'TX' | 'NY'
export type CaseStatus = 'open' | 'in_progress' | 'completed' | 'archived'
export type ArtifactReleaseState = 'draft' | 'review_required' | 'released' | 'archived'
export type ReviewDecision = 'pending' | 'approved' | 'rejected' | 'edited'
export type DocumentParseStatus = 'pending' | 'parsed' | 'failed' | 'unsupported'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due'
export type EventType = 'tool_use' | 'page_view' | 'signup' | 'conversion'

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
