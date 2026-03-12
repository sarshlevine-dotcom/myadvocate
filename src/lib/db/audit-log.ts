// MA-EEAT-001 §5.3 — per-page content review audit log
// Append-only. Called after every content page passes the EEAT validator
// and completes human review. No user-facing exposure.
// MA-SEC-002 P13: reviewer_id and approver are internal identifiers — never PII.

import { createClient } from '@/lib/supabase/server'
import type { ContentTier, ReviewMethod, EEATValidationResult } from '@/types/domain'

export async function logContentReview(params: {
  pageSlug:         string
  pageTitle:        string
  contentTier:      ContentTier
  reviewerId:       string          // internal ID — never displayed publicly
  reviewMethod:     ReviewMethod
  eeатResult:       EEATValidationResult
  flagsRaised?:     string
  flagsResolved?:   string
  approvedBy?:      string          // internal ID of publisher/approver
}) {
  const supabase = await createClient()

  const { layers } = params.eeатResult

  await supabase.from('content_audit_log').insert({
    page_slug:            params.pageSlug,
    page_title:           params.pageTitle,
    content_tier:         params.contentTier,
    reviewer_id:          params.reviewerId,
    review_method:        params.reviewMethod,
    review_date:          new Date().toISOString(),
    // Five-layer EEAT gate results
    eeat_schema_pass:     layers.schema.pass,
    eeat_citations_pass:  layers.citations.pass,
    eeat_claims_pass:     layers.claims.pass,
    eeat_disclaimer_pass: layers.disclaimer.pass,
    eeat_tier_pass:       layers.tier.pass,
    // Flags
    flags_raised:         params.flagsRaised    ?? null,
    flags_resolved:       params.flagsResolved  ?? null,
    // Publish sign-off
    publish_approved_by:  params.approvedBy     ?? null,
    publish_approved_at:  params.approvedBy     ? new Date().toISOString() : null,
  })
}
