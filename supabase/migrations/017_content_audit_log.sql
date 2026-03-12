-- MA-EEAT-001: Content audit log — per-page review records
-- Required from Day 1 per MA-EEAT-001 §5.3.
-- Provides the per-page audit trail needed to survive Google manual review
-- and legal challenge. No user-facing exposure — internal records only.
-- MA-SEC-002 P13: reviewer_id is an internal identifier, never PII.
-- Append-only. Rows are never deleted or updated after publish_approved_at is set.

CREATE TABLE public.content_audit_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Page identity
  page_slug             TEXT NOT NULL,        -- e.g. '/denial-codes/co-50'
  page_title            TEXT NOT NULL,
  content_tier          SMALLINT NOT NULL CHECK (content_tier IN (1, 2, 3)),

  -- Review record
  reviewer_id           TEXT NOT NULL,        -- internal identifier (never public)
  review_method         TEXT NOT NULL CHECK (review_method IN ('checklist', 'editorial', 'attorney')),
  review_date           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- EEAT gate results (MA-EEAT-001 §8.1 — all five layers must PASS before entry created)
  eeat_schema_pass      BOOLEAN NOT NULL DEFAULT false,
  eeat_citations_pass   BOOLEAN NOT NULL DEFAULT false,
  eeat_claims_pass      BOOLEAN NOT NULL DEFAULT false,
  eeat_disclaimer_pass  BOOLEAN NOT NULL DEFAULT false,
  eeat_tier_pass        BOOLEAN NOT NULL DEFAULT false,

  -- Flags
  flags_raised          TEXT,               -- description of any issues found
  flags_resolved        TEXT,               -- how flags were addressed

  -- Publish sign-off
  publish_approved_by   TEXT,               -- internal identifier of approver
  publish_approved_at   TIMESTAMPTZ,

  -- Metadata
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for per-page audit lookups
CREATE INDEX content_audit_log_slug_idx
  ON public.content_audit_log (page_slug);

-- Index for review date range queries (e.g. quarterly audit)
CREATE INDEX content_audit_log_review_date_idx
  ON public.content_audit_log (review_date DESC);

-- Index for finding unpublished records (awaiting approval)
CREATE INDEX content_audit_log_unpublished_idx
  ON public.content_audit_log (content_tier)
  WHERE publish_approved_at IS NULL;

-- RLS: service role only — no user-facing access
ALTER TABLE public.content_audit_log ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated roles.
-- Only the service role (server-side) can read or write audit records.
-- This ensures audit trail integrity — users cannot query or tamper with review records.
