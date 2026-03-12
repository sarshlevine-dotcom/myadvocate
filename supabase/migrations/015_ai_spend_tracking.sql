-- MA-COST-001: Add AI cost tracking columns to metric_events
-- Enables per-feature spend analysis without a separate table.
-- All columns nullable for full backward compatibility.
-- MA-SEC-002 P13: no PII stored — model metadata only.

ALTER TABLE public.metric_events
  ADD COLUMN IF NOT EXISTS model_used    TEXT,
  ADD COLUMN IF NOT EXISTS input_tokens  INTEGER,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER;

-- Index to support per-model cost queries (e.g. weekly cost-per-feature reports)
CREATE INDEX IF NOT EXISTS metric_events_model_used_idx
  ON public.metric_events (model_used)
  WHERE model_used IS NOT NULL;
