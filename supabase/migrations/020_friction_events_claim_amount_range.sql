-- MA-DAT-ENG-P1-006: Update claim_amount_range values for ClaimAmountSelector
-- Migration 019 used dollar-formatted values ('$0-500' etc.).
-- Task spec requires underscore format: under_500 | 500_2000 | 2000_10000 | over_10000
-- Safe to DROP + ADD: column was always written as NULL (no UI surface existed at launch).

ALTER TABLE public.friction_events DROP COLUMN IF EXISTS claim_amount_range;

ALTER TABLE public.friction_events
  ADD COLUMN claim_amount_range TEXT CHECK (claim_amount_range IN (
    'under_500',
    '500_2000',
    '2000_10000',
    'over_10000'
  ));

COMMENT ON COLUMN public.friction_events.claim_amount_range IS
  'MA-DAT-ENG-P1-006: Optional user-submitted range bucket. NULL when user skips. '
  'Never store a precise dollar amount — range buckets only (MA-SUP-DAT-001 §2D).';
