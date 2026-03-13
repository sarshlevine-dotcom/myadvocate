-- ============================================================
-- MA-MEM-002 | TIMS Schema Migration 004
-- Table: outcome_records + trajectory_events FK
-- Authority: MA-MEM-001 | Taxonomy: MA-TRJ-001
-- Owner: Claude Code | Phase: 2 Sprint 2 (table) / Sprint 5 (Beehiiv pipeline)
-- Run order: FOURTH (after trajectory_events, memory_objects)
-- ============================================================
-- The table is created in Sprint 2 so the schema is ready.
-- The Beehiiv integration that populates it is MEM-S5-06 (Sprint 5).
-- trajectory_events.outcome_id FK is added here.
-- ============================================================

-- ── Enum types ────────────────────────────────────────────────

CREATE TYPE tims_outcome_type AS ENUM (
  'appeal_won',
  'appeal_pending',
  'appeal_lost',
  'dispute_resolved',
  'dispute_pending',
  'dispute_failed',
  'no_response',
  'user_reported_helpful',
  'user_reported_unhelpful'
);

CREATE TYPE tims_outcome_source AS ENUM (
  'beehiiv_survey',
  'in_app_feedback',
  'attorney_referral_close',
  'user_self_report'
);

CREATE TYPE tims_outcome_confidence AS ENUM (
  'high',
  'medium',
  'low'
);

-- ── Table ─────────────────────────────────────────────────────

CREATE TABLE outcome_records (
  -- Identity
  id                            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Linkage: which execution this labels
  trajectory_event_id           UUID          NOT NULL REFERENCES trajectory_events(id) ON DELETE RESTRICT,
  -- ON DELETE RESTRICT: never silently lose outcome data

  -- Outcome data
  outcome_type                  tims_outcome_type       NOT NULL,
  reported_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  source                        tims_outcome_source     NOT NULL,
  confidence                    tims_outcome_confidence NOT NULL,

  -- Memory scoring eligibility
  -- FALSE for: low-confidence outcomes, pending outcomes, sources < medium confidence
  memory_promotion_eligible     BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Raw signal preservation (optional — for debugging and audit)
  -- Never store PII here. Store abstracted signal metadata only.
  signal_metadata               JSONB         DEFAULT '{}'
  -- Example: {"survey_question_id": "q_helpful", "response_value": 1}
  -- No name, email, or identifying info.
);

-- ── Constraints ───────────────────────────────────────────────

-- Low-confidence outcomes cannot be memory_promotion_eligible
ALTER TABLE outcome_records ADD CONSTRAINT chk_low_confidence_not_eligible
  CHECK (
    NOT (confidence = 'low' AND memory_promotion_eligible = TRUE)
  );

-- Pending outcomes cannot be memory_promotion_eligible (no confirmed signal yet)
ALTER TABLE outcome_records ADD CONSTRAINT chk_pending_not_eligible
  CHECK (
    NOT (outcome_type IN ('appeal_pending', 'dispute_pending') AND memory_promotion_eligible = TRUE)
  );

-- One outcome record per trajectory event (a trajectory gets one canonical label)
-- If multiple signals arrive, the pipeline should upsert or select the highest-confidence one.
CREATE UNIQUE INDEX idx_outcome_one_per_trajectory
  ON outcome_records (trajectory_event_id);

-- ── Add FK from trajectory_events to outcome_records ─────────
-- This FK was deferred until outcome_records existed.

ALTER TABLE trajectory_events
  ADD CONSTRAINT fk_trajectory_outcome
  FOREIGN KEY (outcome_id) REFERENCES outcome_records(id)
  ON DELETE SET NULL;  -- If an outcome record is deleted, clear the reference (don't cascade delete the trajectory)

-- ── Indexes ───────────────────────────────────────────────────

-- Memory Curator join: find labeled trajectories
CREATE INDEX idx_or_trajectory_event_id
  ON outcome_records (trajectory_event_id);

-- Memory scoring filter: eligible outcomes only
CREATE INDEX idx_or_memory_eligible
  ON outcome_records (trajectory_event_id, outcome_type, confidence)
  WHERE memory_promotion_eligible = TRUE;

-- Beehiiv pipeline: process by report date
CREATE INDEX idx_or_reported_at
  ON outcome_records (reported_at DESC);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE outcome_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tims_outcome_service_only"
  ON outcome_records FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Column comments ───────────────────────────────────────────

COMMENT ON TABLE outcome_records IS
  'MA-MEM-002 | TIMS outcome label store. '
  'Links trajectory executions to real-world outcome signals. '
  'Primary source: Beehiiv 30-day follow-up survey (MEM-S5-06). '
  'No PII in any field. signal_metadata for abstracted signal context only.';

COMMENT ON COLUMN outcome_records.trajectory_event_id IS
  'FK to trajectory_events. One outcome record per trajectory. '
  'Populated by Beehiiv pipeline (MEM-S5-06, Sprint 5). '
  'Table exists from Sprint 2 but will be empty until pipeline is live.';

COMMENT ON COLUMN outcome_records.memory_promotion_eligible IS
  'TRUE only for: confidence >= medium AND outcome_type not pending. '
  'FALSE outcomes are preserved for audit but excluded from memory quality scoring.';

COMMENT ON COLUMN outcome_records.signal_metadata IS
  'Optional abstracted signal context for debugging. '
  'NO PII. No name, email, user ID, or identifying information. '
  'Example: {"survey_question_id": "q_helpful", "response_value": 1}';
