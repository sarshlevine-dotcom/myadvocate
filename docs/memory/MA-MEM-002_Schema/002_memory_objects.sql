-- ============================================================
-- MA-MEM-002 | TIMS Schema Migration 002
-- Table: memory_objects
-- Authority: MA-MEM-001 | Taxonomy: MA-TRJ-001
-- Owner: Claude Code | Phase: 2 Sprint 1
-- Run order: SECOND (depends on tims_workflow_type from migration 001)
-- ============================================================

-- ── Enum types ────────────────────────────────────────────────

CREATE TYPE tims_memory_class AS ENUM (
  'strategy',
  'recovery',
  'optimization'
);

CREATE TYPE tims_memory_status AS ENUM (
  'draft',
  'eligible',
  'approved',
  'restricted',
  'retired'
);

CREATE TYPE tims_ymyl_sensitivity AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE tims_compliance_review_status AS ENUM (
  'pending',
  'approved',
  'flagged',
  'rejected'
);

-- ── Table ─────────────────────────────────────────────────────

CREATE TABLE memory_objects (
  -- Identity
  id                           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Classification
  memory_class                 tims_memory_class        NOT NULL,
  workflow_type                tims_workflow_type        NOT NULL,

  -- Retrieval matching
  -- Structure: {workflow_type?, denial_code_family?, insurer_category?, state_code?, procedure_category?}
  -- All keys optional. More specificity = narrower match.
  trigger_conditions           JSONB         NOT NULL DEFAULT '{}',

  -- Memory content
  -- HARD CONSTRAINT: No legal claims. No user data. Procedural only. Max 500 chars.
  content                      TEXT          NOT NULL
                                 CONSTRAINT chk_content_max_length CHECK (char_length(content) <= 500)
                                 CONSTRAINT chk_content_not_empty CHECK (char_length(trim(content)) > 0),

  -- Provenance
  source_trajectory_ids        UUID[]        NOT NULL
                                 CONSTRAINT chk_min_source_trajectories CHECK (array_length(source_trajectory_ids, 1) >= 1),
  prompt_template_versions     TEXT[]        NOT NULL DEFAULT '{}',
  legal_source_citations       TEXT[]        NOT NULL DEFAULT '{}',
  -- ^ Audit reference only — NOT injected into prompts

  -- Lifecycle
  memory_status                tims_memory_status              NOT NULL DEFAULT 'draft',
  ymyl_sensitivity             tims_ymyl_sensitivity           NOT NULL,
  compliance_review_status     tims_compliance_review_status   NOT NULL DEFAULT 'pending',

  -- Review gates
  kate_reviewed                BOOLEAN       NOT NULL DEFAULT FALSE,
  kate_reviewed_at             TIMESTAMPTZ,
  founder_reviewed_at          TIMESTAMPTZ,

  -- Quality scoring
  outcome_sample_size          INTEGER       CONSTRAINT chk_outcome_sample_positive CHECK (outcome_sample_size IS NULL OR outcome_sample_size >= 0),
  positive_outcome_rate        DECIMAL(4,3)  CONSTRAINT chk_outcome_rate_range CHECK (positive_outcome_rate IS NULL OR (positive_outcome_rate >= 0 AND positive_outcome_rate <= 1)),

  -- Performance tracking
  retrieval_count              INTEGER       NOT NULL DEFAULT 0
                                 CONSTRAINT chk_retrieval_count_positive CHECK (retrieval_count >= 0),
  retrieval_lift_score         DECIMAL(6,4),

  -- Retirement
  retirement_reason            TEXT,

  -- Expiry (for state-law-dependent memories)
  expires_at                   TIMESTAMPTZ,

  -- Legal monitoring
  law_change_flagged           BOOLEAN       NOT NULL DEFAULT FALSE
);

-- ── Constraints ───────────────────────────────────────────────

-- Kate review required for medium/high sensitivity memories before approval
ALTER TABLE memory_objects ADD CONSTRAINT chk_kate_review_for_sensitivity
  CHECK (
    -- If medium or high sensitivity AND approved status, kate_reviewed must be true
    NOT (
      ymyl_sensitivity IN ('medium', 'high')
      AND memory_status = 'approved'
      AND kate_reviewed = FALSE
    )
  );

-- Approved memories must have passed compliance review
ALTER TABLE memory_objects ADD CONSTRAINT chk_approved_requires_compliance
  CHECK (
    NOT (memory_status = 'approved' AND compliance_review_status NOT IN ('approved'))
  );

-- Retirement reason must be present when retired
ALTER TABLE memory_objects ADD CONSTRAINT chk_retirement_reason_required
  CHECK (
    NOT (memory_status = 'retired' AND (retirement_reason IS NULL OR trim(retirement_reason) = ''))
  );

-- law_change_flagged memories cannot be approved (must go through review)
ALTER TABLE memory_objects ADD CONSTRAINT chk_no_approval_on_law_change
  CHECK (
    NOT (law_change_flagged = TRUE AND memory_status = 'approved')
  );

-- ── Auto-update updated_at ────────────────────────────────────

CREATE OR REPLACE FUNCTION tims_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER memory_objects_updated_at
  BEFORE UPDATE ON memory_objects
  FOR EACH ROW EXECUTE FUNCTION tims_update_updated_at();

-- ── Indexes ───────────────────────────────────────────────────

-- PRIMARY RETRIEVAL INDEX: the hot path for generateLetter() pre-execution
-- Covers: approved, not law_change_flagged, by workflow
CREATE INDEX idx_mo_retrieval_eligible
  ON memory_objects (workflow_type, ymyl_sensitivity, retrieval_lift_score DESC NULLS LAST)
  WHERE memory_status = 'approved'
    AND law_change_flagged = FALSE
    AND compliance_review_status = 'approved';

-- trigger_conditions JSONB matching (GIN for @> containment queries)
CREATE INDEX idx_mo_trigger_conditions
  ON memory_objects USING GIN (trigger_conditions);

-- Review Queue: eligible memories awaiting human review
CREATE INDEX idx_mo_review_queue
  ON memory_objects (created_at ASC)
  WHERE memory_status = 'eligible';

-- Law change monitoring
CREATE INDEX idx_mo_law_change
  ON memory_objects (workflow_type, updated_at DESC)
  WHERE law_change_flagged = TRUE;

-- Expiry monitoring (nightly cleanup job)
CREATE INDEX idx_mo_expires
  ON memory_objects (expires_at ASC)
  WHERE expires_at IS NOT NULL AND memory_status != 'retired';

-- Lift score ranking
CREATE INDEX idx_mo_lift_score
  ON memory_objects (retrieval_lift_score DESC NULLS LAST)
  WHERE memory_status = 'approved';

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE memory_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tims_memory_service_only"
  ON memory_objects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Column comments ───────────────────────────────────────────

COMMENT ON TABLE memory_objects IS
  'MA-MEM-002 | TIMS memory store. '
  'No PII. No legal claims in content field. '
  'Hospital Mode templates excluded at application layer (hospital_mode_template check in PromptTemplateMemoryConfig). '
  'Approved memories only enter production retrieval. '
  'Memory NEVER writes to or overrides the Legal Content Database.';

COMMENT ON COLUMN memory_objects.content IS
  'Memory guidance text. Max 500 chars. '
  'No legal claims. No statutory references. No user data. '
  'Procedural only: describes HOW to approach a workflow, not WHAT the legal answer is. '
  'Generated by Memory Curator using approved system prompt (reviewed by Kate per OQ-01).';

COMMENT ON COLUMN memory_objects.trigger_conditions IS
  'JSONB match criteria. '
  'Keys: workflow_type (required), denial_code_family, insurer_category, state_code, procedure_category (all optional). '
  'More keys = narrower match. Retrieval uses @> containment: event context must contain all trigger keys. '
  'Example: {"workflow_type": "denial_appeal", "insurer_category": "BCBS_NATIONAL", "state_code": "TX"}';

COMMENT ON COLUMN memory_objects.legal_source_citations IS
  'Legal Content DB source IDs referenced during generation. '
  'For auditability ONLY. NOT injected into prompts. '
  'Memory content never carries legal substance — these citations document what the Curator was aware of.';

COMMENT ON COLUMN memory_objects.positive_outcome_rate IS
  'Rate of positive outcomes in labeled source trajectories (0.0–1.0). '
  'Promotion thresholds: optimization >= 0.3, strategy/recovery >= 0.5 (per OQ-02 decision).';

COMMENT ON COLUMN memory_objects.retrieval_lift_score IS
  'Measured improvement in user_action rate (saved/downloaded) '
  'when this memory was present vs. absent. '
  'Computed by lift measurement query (MEM-S4-03). NULL until sufficient retrieval data.';
