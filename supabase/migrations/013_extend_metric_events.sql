-- PMP v19 §8: Extend metric_events with per-case telemetry context columns
-- MA-SEC-002 P13: user_id is the Supabase auth UUID only — never email, name, or PII

-- Add per-case context columns (all nullable for backward compatibility)
ALTER TABLE public.metric_events
  ADD COLUMN IF NOT EXISTS user_id        UUID,
  ADD COLUMN IF NOT EXISTS amount_cents   INTEGER,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- Drop existing event_type CHECK constraint, then re-add with expanded values
-- (Cannot ALTER CHECK inline — must drop and recreate)
ALTER TABLE public.metric_events
  DROP CONSTRAINT IF EXISTS metric_events_event_type_check;

ALTER TABLE public.metric_events
  ADD CONSTRAINT metric_events_event_type_check
  CHECK (event_type IN (
    'tool_use',
    'page_view',
    'signup',
    'conversion',
    'letter_generated',     -- fires when a letter is generated (completion rate)
    'per_case_checkout',    -- fires when user clicks buy on $13 product
    'per_case_purchased',   -- fires on Stripe webhook confirmation
    'subscription_started', -- fires on Stripe subscription webhook
    'second_tool_use'       -- fires when a returning user uses a second tool
  ));
