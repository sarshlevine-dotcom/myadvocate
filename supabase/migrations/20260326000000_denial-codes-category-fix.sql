-- Migration: denial_codes_category_fix
-- Extends category CHECK with medical_necessity, coverage, billing_error.
-- Adds CHECK constraint to tool_cta_id (column exists from 20260311... migration, no CHECK was set).
-- Adds category index for content engine + Denial Decoder filter queries.
-- All existing rows remain valid: NULL tool_cta_id passes CHECK (PostgreSQL NULL semantics).

-- Fix 1: Expand category CHECK from 10 to 13 values.
-- Drop first (IF EXISTS) then recreate in idempotent DO block — mirrors 20260311... pattern.
ALTER TABLE public.denial_codes
  DROP CONSTRAINT IF EXISTS denial_codes_category_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'denial_codes_category_check'
      AND conrelid = 'public.denial_codes'::regclass
  ) THEN
    ALTER TABLE public.denial_codes
      ADD CONSTRAINT denial_codes_category_check
      CHECK (category IN (
        'labs', 'imaging', 'surgery', 'dme', 'pharmacy',
        'mental_health', 'prior_auth', 'coordination', 'timely_filing', 'other',
        'medical_necessity', 'coverage', 'billing_error'
      ));
  END IF;
END $$;

-- Fix 2: Add CHECK to tool_cta_id (column exists, constraint does not).
-- NULL passes PostgreSQL CHECK constraints — no IS NULL guard needed.
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
