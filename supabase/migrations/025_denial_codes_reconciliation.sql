-- Migration: 025_denial_codes_reconciliation
-- Purpose: Reconcile denial_codes table with content flywheel schema requirements.
-- Adds columns introduced in code_pack_v1 WITHOUT modifying or dropping any existing columns.
-- Existing columns (from 010 + 018) remain untouched:
--   id, code, category, plain_language_explanation, recommended_action, source,
--   updated_at, target_keyword, search_volume, tool_route, cluster_id
-- New columns added here:
--   title              — human-readable display name for the denial code
--   plain_language_meaning — alias/supplement to plain_language_explanation for content engine
--   recommended_next_step  — alias/supplement to recommended_action for content engine
--   seo_slug           — canonical URL slug for the denial code page (e.g. co-16-missing-invalid-information)
--   risk_notes         — clinical/legal risk notes for Kate review and LQE
--   review_status      — content engine review state: draft / approved / needs_review / archived
--
-- IMPORTANT (MA-DAT-002 + supabase/migrations/CLAUDE.md):
--   Append-only. Never edit past migrations.
--   Existing product code continues using plain_language_explanation and recommended_action.
--   New content engine uses plain_language_meaning and recommended_next_step.
--   Both sets of columns are valid — no FK conflict.

ALTER TABLE public.denial_codes
  ADD COLUMN IF NOT EXISTS title                  TEXT,
  ADD COLUMN IF NOT EXISTS plain_language_meaning TEXT,
  ADD COLUMN IF NOT EXISTS recommended_next_step  TEXT,
  ADD COLUMN IF NOT EXISTS seo_slug               TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS risk_notes             TEXT,
  ADD COLUMN IF NOT EXISTS review_status          TEXT NOT NULL DEFAULT 'draft'
                             CHECK (review_status IN ('draft','approved','needs_review','archived'));

-- Index for content engine queries (cluster + SEO slug lookups)
CREATE INDEX IF NOT EXISTS idx_denial_codes_seo_slug     ON public.denial_codes(seo_slug);
CREATE INDEX IF NOT EXISTS idx_denial_codes_review_status ON public.denial_codes(review_status);
