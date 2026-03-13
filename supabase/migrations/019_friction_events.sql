-- MA-SUP-DAT-001: Proprietary Data Engine — friction_events table
-- Phase 1 stub. All fields present; outcome columns nullable.
-- No UI surface at launch. Outcome tracking activates Phase 2 (Month 3–4).
-- Privacy: NO PII stored. All fields are bounded, categorical, and anonymized at write time.
-- See MA-SUP-DAT-001 Section 3 for four-layer privacy architecture compliance.
-- MA-SEC-002: re-identification via field combination is the primary risk.
--   Mitigation: minimum field set enforced at write time; no PII fields permitted in schema.
-- HIPAA gate: legal review of insurer+procedure_type+state combination at scale
--   required before any Phase 3 publication activity (MA-SUP-DAT-001 §3, §7).

CREATE TABLE public.friction_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dataset One: Insurance Friction (captured at tool usage — all tools)
  tool_used             TEXT NOT NULL CHECK (tool_used IN (
                          'denial_decoder',
                          'appeal_letter',
                          'bill_dispute',
                          'resource_connector',
                          'prior_auth'           -- Phase 2+ tool
                        )),

  -- Denial Decoder / Appeal Letter fields
  denial_code           TEXT,                    -- e.g. 'CO-16', 'PR-96'
  insurer               TEXT,                    -- insurer name — categorical, no member IDs
  procedure_type        TEXT,                    -- service category, NOT specific diagnosis
  service_category      TEXT,                    -- broader classification
  state                 CHAR(2),                 -- state abbreviation only

  -- Bill Dispute fields
  billing_error_type    TEXT,
  provider_category     TEXT,                    -- hospital / specialist / lab / pharmacy
  charge_amount_range   TEXT CHECK (charge_amount_range IN (
                          '$0-500', '$500-2k', '$2k-10k', '$10k+'
                        )),                      -- optional range bucket, NOT precise amount
  insurance_status      TEXT,                    -- insured / uninsured / underinsured

  -- Resource Connector fields
  escalation_type       TEXT,

  -- Financial impact (optional, user-submitted — see MA-SUP-DAT-001 §2D)
  claim_amount_range    TEXT CHECK (claim_amount_range IN (
                          '$0-500', '$500-2k', '$2k-10k', '$10k+'
                        )),                      -- NULL if user skips; nurse co-founder must approve prompt language

  -- Dataset Two: Appeal Outcome (nullable — populated via Phase 2 follow-up flow)
  case_id               UUID REFERENCES public.cases(id) ON DELETE SET NULL,
                                                 -- internal only — never exposed in analytics
  appeal_outcome        TEXT CHECK (appeal_outcome IN (
                          'approved',
                          'partially_approved',
                          'denied',
                          'pending',
                          'settled'
                        )),                      -- NULL until follow-up flow activates (Phase 2)
  days_to_resolution    SMALLINT,               -- optional, self-reported
  follow_up_required    BOOLEAN                  -- did user need to escalate further?
);

-- RLS: service-role write only at launch; analytics reads via service role only
ALTER TABLE public.friction_events ENABLE ROW LEVEL SECURITY;

-- No user-facing read policy at launch — analytics are internal only
-- Phase 2: add read policy for in-product success-rate display (aggregate only)

-- Indexes for Phase 3 analytics queries
CREATE INDEX idx_friction_denial_code ON public.friction_events (denial_code);
CREATE INDEX idx_friction_insurer     ON public.friction_events (insurer);
CREATE INDEX idx_friction_state       ON public.friction_events (state);
CREATE INDEX idx_friction_tool_used   ON public.friction_events (tool_used);
CREATE INDEX idx_friction_outcome     ON public.friction_events (appeal_outcome);

COMMENT ON TABLE public.friction_events IS
  'MA-SUP-DAT-001: Proprietary Data Engine. Anonymized friction and outcome events. '
  'No PII permitted. Phase 1 = stub (outcome cols nullable). Phase 2 = follow-up flow. '
  'Phase 3+ = publication (1000+ records required per MA-SUP-DAT-001 §4).';
