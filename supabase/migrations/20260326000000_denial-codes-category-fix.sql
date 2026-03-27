-- Migration: denial_codes_category_fix
-- Extends category CHECK with medical_necessity, coverage, billing_error.
-- Adds CHECK constraint to tool_cta_id (column exists from 20260311... migration, no CHECK was set).
-- Adds category index for content engine + Denial Decoder filter queries.
-- All existing rows remain valid: NULL tool_cta_id passes CHECK (PostgreSQL NULL semantics).

-- Fix 1: Expand category CHECK from 10 to 13 values.
-- DROP IF EXISTS removes the constraint (if present), then ADD recreates it.
-- This is safe to re-run: DROP is a no-op when constraint is absent.
ALTER TABLE public.denial_codes
  DROP CONSTRAINT IF EXISTS denial_codes_category_check;

ALTER TABLE public.denial_codes
  ADD CONSTRAINT denial_codes_category_check
  CHECK (category IN (
    'labs', 'imaging', 'surgery', 'dme', 'pharmacy',
    'mental_health', 'prior_auth', 'coordination', 'timely_filing', 'other',
    'medical_necessity', 'coverage', 'billing_error'
  ));

-- Fix 2: Add CHECK to tool_cta_id (column exists, constraint does not).
-- Same DROP+ADD pattern as Fix 1. NULL passes PostgreSQL CHECK — no IS NULL guard needed.
-- All existing rows with tool_cta_id = NULL pass this constraint.
ALTER TABLE public.denial_codes
  DROP CONSTRAINT IF EXISTS denial_codes_tool_cta_id_check;

ALTER TABLE public.denial_codes
  ADD CONSTRAINT denial_codes_tool_cta_id_check
  CHECK (tool_cta_id IN (
    'denial_decoder', 'appeal_generator', 'bill_dispute', 'hipaa_request'
  ));

-- Fix 3: Category index for filter queries.
CREATE INDEX IF NOT EXISTS idx_denial_codes_category
  ON public.denial_codes (category);
