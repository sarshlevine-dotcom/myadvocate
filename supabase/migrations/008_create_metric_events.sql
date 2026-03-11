-- MA-SEC-002 P13: NO PII fields — ever
CREATE TABLE public.metric_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type  TEXT NOT NULL CHECK (event_type IN ('tool_use', 'page_view', 'signup', 'conversion')),
  source_page TEXT NOT NULL,
  tool_name   TEXT,
  case_id     UUID  -- nullable, never required
);
-- No RLS — append-only, admin reads via service role
