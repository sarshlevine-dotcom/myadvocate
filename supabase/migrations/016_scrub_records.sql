-- Migration 016: scrub_records table for MA-SOC-002 Patient Story Engine
-- Every story entering the script pipeline must have a scrub record before scripting begins.
-- The scrub record is the audit trail for PII removal and review gating.
-- Source: MA-SOC-002 Section 2 — PII Scrubbing & Semi-Fictionalization Protocol

CREATE TABLE IF NOT EXISTS public.scrub_records (
  -- Identity
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        TEXT NOT NULL UNIQUE,                -- human-readable ID (e.g. STR-0001)

  -- Source provenance
  source_track    TEXT NOT NULL CHECK (source_track IN ('A', 'B')),
                  -- A = submission form, B = research (public records)
  source_type     TEXT NOT NULL CHECK (source_type IN (
                    'submission', 'reddit', 'cfpb', 'commissioner', 'forum', 'news'
                  )),
  source_ref      TEXT,                                -- internal reference only — never published
                                                       -- Track B: URL or document ref; Track A: NULL

  -- PII scrub audit
  scrub_completed_by TEXT NOT NULL,                    -- founder or nurse initials
  scrub_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
  pii_removed     BOOLEAN NOT NULL DEFAULT FALSE,      -- confirms scrub pass completed
  semi_fictionalized BOOLEAN NOT NULL DEFAULT FALSE,   -- Track B only; must be FALSE for Track A

  -- Clinical review gate
  nurse_review_required  BOOLEAN NOT NULL DEFAULT FALSE,
  nurse_review_completed BOOLEAN NOT NULL DEFAULT FALSE,
  nurse_reviewer         TEXT,                         -- nurse initials if review completed

  -- Final approval gate
  approved_for_script BOOLEAN NOT NULL DEFAULT FALSE,  -- hard gate before pipeline entry

  -- Story classification
  story_type      TEXT NOT NULL CHECK (story_type IN (
                    'denial', 'billing', 'rights', 'navigation'
                  )),
  primary_denial_code TEXT,                            -- CARC code or issue type string
  state_context   TEXT,                                -- scrubbed state (state alone OK; never city+state)
  insurance_category TEXT CHECK (insurance_category IN (
                    'commercial', 'medicare', 'medicaid', 'medicare_advantage',
                    'marketplace', 'employer_sponsored', 'uninsured', 'other'
                  )),

  -- Pipeline tracking
  script_started_at   TIMESTAMPTZ,                     -- set when script generation begins
  script_approved_at  TIMESTAMPTZ,                     -- set when human review passes
  video_generated_at  TIMESTAMPTZ,                     -- set when HeyGen render completes
  published_at        TIMESTAMPTZ,                     -- set when video goes live

  -- Audit timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Constraints ───────────────────────────────────────────────────────────────

-- Nurse review must be completed before approval for nurse-required stories
ALTER TABLE public.scrub_records
  ADD CONSTRAINT nurse_review_gate
  CHECK (
    NOT (approved_for_script = TRUE AND nurse_review_required = TRUE AND nurse_review_completed = FALSE)
  );

-- PII scrub must be complete before approval
ALTER TABLE public.scrub_records
  ADD CONSTRAINT pii_scrub_gate
  CHECK (
    NOT (approved_for_script = TRUE AND pii_removed = FALSE)
  );

-- Semi-fictionalization only applies to Track B
ALTER TABLE public.scrub_records
  ADD CONSTRAINT semi_fictionalization_track_b_only
  CHECK (
    NOT (semi_fictionalized = TRUE AND source_track = 'A')
  );

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_scrub_records_story_type        ON public.scrub_records(story_type);
CREATE INDEX idx_scrub_records_approved          ON public.scrub_records(approved_for_script);
CREATE INDEX idx_scrub_records_source_track      ON public.scrub_records(source_track);
CREATE INDEX idx_scrub_records_nurse_review      ON public.scrub_records(nurse_review_required, nurse_review_completed);
CREATE INDEX idx_scrub_records_primary_denial    ON public.scrub_records(primary_denial_code);
CREATE INDEX idx_scrub_records_created_at        ON public.scrub_records(created_at DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.scrub_records ENABLE ROW LEVEL SECURITY;

-- Service role (server-side) has full access
CREATE POLICY "service_role_all" ON public.scrub_records
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anon / authenticated users: no access — scrub records are internal only
-- source_ref fields may contain pre-scrub references that must never be exposed to users

-- ── Updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_scrub_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_scrub_records_updated_at
  BEFORE UPDATE ON public.scrub_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_scrub_records_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.scrub_records IS
  'MA-SOC-002 Patient Story Engine audit trail. Every story must have a complete scrub record before script production begins. source_ref is internal only — never exposed to users or in API responses.';

COMMENT ON COLUMN public.scrub_records.source_ref IS
  'INTERNAL USE ONLY. Pre-scrub source reference (URL, document ID, or manual note). Never include in API responses or user-facing outputs.';

COMMENT ON COLUMN public.scrub_records.semi_fictionalized IS
  'Track B only. TRUE means surface details changed while preserving emotional/situational truth. Never TRUE for Track A (direct submission).';

COMMENT ON COLUMN public.scrub_records.approved_for_script IS
  'Hard gate. Must be TRUE before script production begins. Gates: pii_removed=TRUE, and if nurse_review_required=TRUE then nurse_review_completed=TRUE.';
