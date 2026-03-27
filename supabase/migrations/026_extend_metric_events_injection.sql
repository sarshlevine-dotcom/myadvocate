-- MA-SEC-002 P21/P23: Add injection_attempt event type
-- Also adds gate_failure, lqe_passed, lqe_failed, gate_7_passed which exist in
-- domain.ts EventType but were missing from the DB CHECK constraint (silent insert failures).

ALTER TABLE public.metric_events
  DROP CONSTRAINT IF EXISTS metric_events_event_type_check;

ALTER TABLE public.metric_events
  ADD CONSTRAINT metric_events_event_type_check
  CHECK (event_type IN (
    'tool_use',
    'page_view',
    'signup',
    'conversion',
    'letter_generated',
    'per_case_checkout',
    'per_case_purchased',
    'subscription_started',
    'second_tool_use',
    'gate_failure',         -- generate-letter.ts Gate failure telemetry
    'lqe_passed',           -- LQE gate passed
    'lqe_failed',           -- LQE gate failed
    'gate_7_passed',        -- final gate passed
    'injection_attempt'     -- MA-SEC-002 P23: prompt injection detected
  ));
