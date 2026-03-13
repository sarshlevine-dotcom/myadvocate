-- ============================================================
-- MA-MEM-002 | TIMS Schema Migration 001
-- Table: trajectory_events
-- Authority: MA-MEM-001 | Taxonomy: MA-TRJ-001
-- Owner: Claude Code | Phase: 2 Sprint 1
-- Run order: FIRST (no dependencies)
-- ============================================================

-- ── Enum types ────────────────────────────────────────────────

CREATE TYPE tims_workflow_type AS ENUM (
  'denial_appeal',
  'bill_dispute',
  'denial_decode',
  'resource_route',
  'report_abuse'
);

CREATE TYPE tims_output_class AS ENUM (
  'letter_generated',
  'explanation_only',
  'escalation_required',
  'insufficient_input',
  'error'
);

CREATE TYPE tims_user_action AS ENUM (
  'saved',
  'downloaded',
  'copied',
  'abandoned'
);

CREATE TYPE tims_tier AS ENUM (
  'free',
  'standard',
  'founding',
  'per_case'
);

CREATE TYPE tims_cost_bucket AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE tims_duration_bucket AS ENUM (
  'fast',
  'medium',
  'slow'
);

CREATE TYPE tims_letter_length_bucket AS ENUM (
  'short',
  'medium',
  'long'
);

-- ── Table ─────────────────────────────────────────────────────

CREATE TABLE trajectory_events (
  -- Identity
  id                              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Workflow context (bucketed / abstracted — NO PII)
  workflow_type                   tims_workflow_type  NOT NULL,
  denial_code_family              TEXT,         -- See MA-TRJ-001 §2. NULL if not applicable.
  insurer_category                TEXT,         -- See MA-TRJ-001 §3. NULL if not applicable.
  state_code                      CHAR(2),      -- Two-letter US state. NULL if not relevant to routing.
  procedure_category              TEXT,         -- See MA-TRJ-001 §4. NULL if not applicable.

  -- Execution context
  prompt_template_version         TEXT          NOT NULL,
  model_used                      TEXT          NOT NULL,
  tools_invoked                   TEXT[]        NOT NULL DEFAULT '{}',
  retrieval_sources_count         INTEGER,
  compliance_flags                TEXT[]        NOT NULL DEFAULT '{}',
  output_class                    tims_output_class NOT NULL,
  letter_length_bucket            tims_letter_length_bucket,

  -- User signal (bucketed — NO PII)
  user_action                     tims_user_action,

  -- Session (firewall enforced — NOT linked to user_id anywhere)
  session_id                      UUID          NOT NULL,

  -- Tier and cost context
  tier_at_execution               tims_tier,
  api_cost_bucket                 tims_cost_bucket,
  execution_duration_ms_bucket    tims_duration_bucket,

  -- Recovery / fallback context
  fallback_triggered              BOOLEAN       NOT NULL DEFAULT FALSE,
  recovery_pattern_used           TEXT,

  -- Outcome linkage (nullable at write time; populated by Beehiiv pipeline in Sprint 5)
  outcome_id                      UUID          -- FK added after outcome_records table exists (migration 004)
);

-- ── Constraints ───────────────────────────────────────────────

-- denial_code_family only meaningful for denial workflows
ALTER TABLE trajectory_events ADD CONSTRAINT chk_denial_code_family_scope
  CHECK (
    denial_code_family IS NULL
    OR workflow_type IN ('denial_appeal', 'denial_decode')
  );

-- state_code must be 2 uppercase letters if present
ALTER TABLE trajectory_events ADD CONSTRAINT chk_state_code_format
  CHECK (state_code IS NULL OR state_code ~ '^[A-Z]{2}$');

-- ── Indexes ───────────────────────────────────────────────────

-- Memory Curator nightly query: labeled trajectories by recency
CREATE INDEX idx_te_outcome_created
  ON trajectory_events (created_at DESC)
  WHERE outcome_id IS NOT NULL;

-- Memory Curator clustering: core cluster key
CREATE INDEX idx_te_cluster_key
  ON trajectory_events (workflow_type, denial_code_family, insurer_category, state_code);

-- Outcome linkage lookup
CREATE INDEX idx_te_outcome_id
  ON trajectory_events (outcome_id)
  WHERE outcome_id IS NOT NULL;

-- Retrieval log join
CREATE INDEX idx_te_id_created
  ON trajectory_events (id, created_at);

-- output_class filter (Memory Curator restricts to letter_generated, explanation_only)
CREATE INDEX idx_te_output_class
  ON trajectory_events (output_class, created_at DESC);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE trajectory_events ENABLE ROW LEVEL SECURITY;

-- Service role only — no direct user access, no authenticated user access
CREATE POLICY "tims_trajectory_service_only"
  ON trajectory_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Explicitly deny anon and authenticated roles
-- (Supabase default: RLS enabled + no matching policy = deny)

-- ── Column comments ───────────────────────────────────────────

COMMENT ON TABLE trajectory_events IS
  'MA-MEM-002 | TIMS trajectory log. '
  'NO PII permitted in any field. '
  'All writes occur AFTER the four-layer privacy gate and PII scrubber. '
  'session_id is NOT a join key to any user table — privacy firewall enforced.';

COMMENT ON COLUMN trajectory_events.session_id IS
  'Ephemeral session token. NOT linked to user_id in this or any other table. '
  'Do not add a foreign key to auth.users or any user table.';

COMMENT ON COLUMN trajectory_events.denial_code_family IS
  'Bucketed denial code group per MA-TRJ-001 §2. '
  'NEVER store the raw denial code or CPT code entered by the user.';

COMMENT ON COLUMN trajectory_events.insurer_category IS
  'Insurer category per MA-TRJ-001 §3. '
  'NEVER store the insurer name if individually identifiable.';

COMMENT ON COLUMN trajectory_events.state_code IS
  'Two-letter US state code. Included only when relevant to legal routing. '
  'NULL otherwise. No PII.';

COMMENT ON COLUMN trajectory_events.outcome_id IS
  'FK to outcome_records.id. NULL at write time. '
  'Populated by Beehiiv pipeline (MEM-S5-06). '
  'FK constraint added in migration 004 after outcome_records exists.';

-- ── Cost/duration bucket calibration note ─────────────────────

COMMENT ON COLUMN trajectory_events.api_cost_bucket IS
  'Bucketed API cost per MA-TRJ-001 §8. '
  'Thresholds (low/medium/high) calibrated in Sprint 1 from baseline cost data. '
  'Document thresholds in MA-MEM-002 calibration table. Review quarterly.';

COMMENT ON COLUMN trajectory_events.execution_duration_ms_bucket IS
  'Bucketed execution latency per MA-TRJ-001 §9. '
  'Thresholds set in Sprint 1. p50 = fast/medium boundary, p90 = medium/slow boundary.';
