-- ============================================================
-- MA-MEM-002 | TIMS Schema Migration 005
-- Table: memory_retrieval_log
-- Authority: MA-MEM-001 | Taxonomy: MA-TRJ-001
-- Owner: Claude Code | Phase: 2 Sprint 4
-- Run order: FIFTH (after trajectory_events, memory_objects)
-- ============================================================
-- Logs every memory retrieval event for:
--   (a) Auditability
--   (b) Lift measurement (MEM-S4-02 / MEM-S4-03)
--   (c) Memory promotion / demotion scoring
-- ============================================================

CREATE TABLE memory_retrieval_log (
  -- Identity
  id                            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  retrieved_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Context: which execution triggered this retrieval
  trajectory_event_id           UUID          NOT NULL REFERENCES trajectory_events(id) ON DELETE RESTRICT,

  -- What was retrieved
  memory_ids_retrieved          UUID[]        NOT NULL DEFAULT '{}',
  -- ^ All memories returned by the retrieval query (before cap)

  memory_ids_injected           UUID[]        NOT NULL DEFAULT '{}',
  -- ^ Memories actually injected into the prompt (after max_memories_injected cap)

  -- Retrieval mechanics
  retrieval_strategy_used       TEXT          NOT NULL,
  -- e.g., 'metadata_match', 'hybrid' (Phase 3+)

  match_scores                  DECIMAL(6,4)[] NOT NULL DEFAULT '{}',
  -- Match score for each memory in memory_ids_retrieved (parallel array, same order)

  -- Lift measurement signal
  -- Captured from TrajectoryEvent.user_action AFTER execution completes
  -- NULL at write time; updated by a subsequent event or pipeline job
  user_action_post_retrieval    tims_user_action,

  -- A/B tracking flag (OQ-03 decision: lookalike comparison, not hard A/B split)
  -- TRUE = this execution had memory injected; FALSE = no memory (baseline)
  -- Used to identify lookalike comparison groups in lift measurement query
  memory_was_injected           BOOLEAN       NOT NULL
                                  GENERATED ALWAYS AS (cardinality(memory_ids_injected) > 0) STORED
);

-- ── Indexes ───────────────────────────────────────────────────

-- Lift measurement query (MEM-S4-03): compare injected vs. not injected by user_action
CREATE INDEX idx_mrl_lift_measurement
  ON memory_retrieval_log (trajectory_event_id, memory_was_injected, user_action_post_retrieval)
  WHERE user_action_post_retrieval IS NOT NULL;

-- Per-memory performance lookup: how is a specific memory performing?
CREATE INDEX idx_mrl_memory_performance
  ON memory_retrieval_log USING GIN (memory_ids_injected);

-- Memory Curator: score retrieval_lift_score per memory_object
CREATE INDEX idx_mrl_injected_action
  ON memory_retrieval_log (retrieved_at DESC)
  WHERE memory_was_injected = TRUE;

-- Trajectory join
CREATE INDEX idx_mrl_trajectory
  ON memory_retrieval_log (trajectory_event_id, retrieved_at DESC);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE memory_retrieval_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tims_retrieval_log_service_only"
  ON memory_retrieval_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Column comments ───────────────────────────────────────────

COMMENT ON TABLE memory_retrieval_log IS
  'MA-MEM-002 | TIMS retrieval audit log. '
  'Every memory retrieval event is logged here for lift measurement and auditability. '
  'Primary purpose: feed MEM-S4-03 lift measurement query and update memory_objects.retrieval_lift_score.';

COMMENT ON COLUMN memory_retrieval_log.memory_ids_retrieved IS
  'All memories returned by the retrieval query before the max_memories_injected cap. '
  'Parallel array with match_scores.';

COMMENT ON COLUMN memory_retrieval_log.memory_ids_injected IS
  'Memories actually injected into the prompt after the cap. '
  'Empty array = no memory injection for this execution (baseline group for lookalike comparison).';

COMMENT ON COLUMN memory_retrieval_log.match_scores IS
  'Match score for each memory in memory_ids_retrieved. '
  'Parallel array — index 0 = score for memory_ids_retrieved[1], etc. '
  'For metadata_match strategy: score = count of matching trigger_conditions fields (0–5).';

COMMENT ON COLUMN memory_retrieval_log.user_action_post_retrieval IS
  'User action taken after this execution. '
  'Captured from trajectory_events.user_action when available. '
  'This is the dependent variable in the lift measurement query (MEM-S4-03). '
  'NULL until frontend event is captured.';

COMMENT ON COLUMN memory_retrieval_log.memory_was_injected IS
  'Generated column: TRUE if memory_ids_injected is non-empty. '
  'Used as the group selector in lookalike lift comparison (OQ-03 decision).';

-- ── Lift measurement query (reference) ───────────────────────
-- Weekly lift measurement query to run in founder dashboard (MEM-S4-03):
--
-- SELECT
--   memory_was_injected,
--   COUNT(*) AS executions,
--   COUNT(*) FILTER (WHERE user_action_post_retrieval IN ('saved', 'downloaded')) AS positive_actions,
--   ROUND(
--     COUNT(*) FILTER (WHERE user_action_post_retrieval IN ('saved', 'downloaded'))::DECIMAL
--     / NULLIF(COUNT(*), 0) * 100,
--     2
--   ) AS positive_action_rate_pct
-- FROM memory_retrieval_log
-- WHERE user_action_post_retrieval IS NOT NULL
--   AND retrieved_at >= NOW() - INTERVAL '30 days'
-- GROUP BY memory_was_injected;
--
-- Per-memory lift score update (run by Memory Curator nightly):
--
-- UPDATE memory_objects mo
-- SET retrieval_lift_score = (
--   SELECT
--     AVG(CASE WHEN mrl.user_action_post_retrieval IN ('saved', 'downloaded') THEN 1.0 ELSE 0.0 END)
--     FILTER (WHERE mo.id = ANY(mrl.memory_ids_injected))
--   - AVG(CASE WHEN mrl.user_action_post_retrieval IN ('saved', 'downloaded') THEN 1.0 ELSE 0.0 END)
--     FILTER (WHERE NOT (mo.id = ANY(mrl.memory_ids_injected)) AND mrl.trajectory_event_id IN (
--       -- lookalike group: same workflow_type, same time window, no memory injected
--       SELECT id FROM trajectory_events te2
--       WHERE te2.workflow_type = (SELECT te.workflow_type FROM trajectory_events te WHERE te.id = mrl.trajectory_event_id LIMIT 1)
--       AND te2.created_at BETWEEN NOW() - INTERVAL '30 days' AND NOW()
--     ))
--   FROM memory_retrieval_log mrl
--   WHERE mo.id = ANY(mrl.memory_ids_injected)
--   AND mrl.retrieved_at >= NOW() - INTERVAL '30 days'
--   AND mrl.user_action_post_retrieval IS NOT NULL
-- )
-- WHERE mo.retrieval_count >= 10;  -- Only score memories with sufficient exposure
