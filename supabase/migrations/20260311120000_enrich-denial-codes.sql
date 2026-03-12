-- Migration: enrich_denial_codes
-- Adds common_causes, appeal_angle, related_codes, tool_cta_id columns.
-- Expands category CHECK constraint with healthcare-domain values.

-- 1. Add new columns (nullable so existing rows remain valid until seed backfills them)
ALTER TABLE public.denial_codes
  ADD COLUMN IF NOT EXISTS common_causes   TEXT,
  ADD COLUMN IF NOT EXISTS appeal_angle    TEXT,
  ADD COLUMN IF NOT EXISTS related_codes   TEXT[],
  -- tool_cta_id: application-level enum; see ToolCtaId in src/types/domain.ts
  ADD COLUMN IF NOT EXISTS tool_cta_id     TEXT;

-- 2. Drop the old category CHECK and recreate with expanded values.
-- PostgreSQL auto-names inline CHECK constraints as {table}_{column}_check.
ALTER TABLE public.denial_codes
  DROP CONSTRAINT IF EXISTS denial_codes_category_check;

-- Wrap ADD CONSTRAINT in DO block for idempotency (no IF NOT EXISTS syntax in PG).
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
        'mental_health', 'prior_auth', 'coordination', 'timely_filing', 'other'
      ));
  END IF;
END $$;
