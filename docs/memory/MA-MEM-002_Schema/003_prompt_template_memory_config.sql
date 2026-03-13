-- ============================================================
-- MA-MEM-002 | TIMS Schema Migration 003
-- Extension: prompt_template_memory_config
-- Authority: MA-MEM-001 | Taxonomy: MA-TRJ-001
-- Owner: Claude Code | Phase: 2 Sprint 2
-- Run order: THIRD (after migration 002 — references tims enums)
-- ============================================================
-- This migration extends the existing Prompt Template Registry
-- with TIMS memory configuration fields.
-- The prompt_templates table is assumed to exist.
-- If it does not yet exist, create it first per MA-ARC-001.
-- ============================================================

-- ── Enum types ────────────────────────────────────────────────

CREATE TYPE tims_retrieval_strategy AS ENUM (
  'metadata_match',  -- Phase 2: structured JSONB matching (available now)
  'hybrid'           -- Phase 3+: pgvector semantic + metadata reranking (deferred)
);

-- ── Add columns to prompt_templates ──────────────────────────
-- All columns default to the most restrictive / safest value.
-- memory_enabled = false by default means NO template has memory until explicitly enabled.

ALTER TABLE prompt_templates
  ADD COLUMN IF NOT EXISTS memory_enabled               BOOLEAN                   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allowed_memory_classes       TEXT[]                    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_memories_injected        INTEGER                   NOT NULL DEFAULT 2
                                                          CONSTRAINT chk_max_memories_cap CHECK (max_memories_injected BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS ymyl_sensitivity             tims_ymyl_sensitivity     NOT NULL DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS memory_retrieval_strategy    tims_retrieval_strategy   NOT NULL DEFAULT 'metadata_match',
  ADD COLUMN IF NOT EXISTS require_approved_status      BOOLEAN                   NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS hospital_mode_template       BOOLEAN                   NOT NULL DEFAULT FALSE;

-- ── Critical constraint: hospital mode templates ──────────────
-- If hospital_mode_template = TRUE, memory_enabled MUST be FALSE.
-- This is the permanent Hospital Mode firewall.
-- Code-level enforcement in generateLetter() is primary.
-- This constraint is a structural backstop.

ALTER TABLE prompt_templates ADD CONSTRAINT chk_hospital_mode_memory_firewall
  CHECK (
    NOT (hospital_mode_template = TRUE AND memory_enabled = TRUE)
  );

-- ── Critical constraint: allowed_memory_classes values ────────
-- Prevent invalid class names slipping in via config.

ALTER TABLE prompt_templates ADD CONSTRAINT chk_allowed_memory_classes_valid
  CHECK (
    allowed_memory_classes <@ ARRAY['strategy', 'recovery', 'optimization']::TEXT[]
  );

-- ── Critical constraint: hybrid retrieval is Phase 3 only ─────
-- Cannot enable hybrid retrieval until pgvector is live (Phase 3).
-- Remove this constraint when Phase 3 pgvector planning is complete and approved.

ALTER TABLE prompt_templates ADD CONSTRAINT chk_no_hybrid_before_phase3
  CHECK (
    memory_retrieval_strategy != 'hybrid'
    -- Remove this constraint in Phase 3 when pgvector is live
  );

-- ── Mark all existing Hospital Mode templates ─────────────────
-- IMPORTANT: Run this UPDATE immediately after adding the columns.
-- Replace the WHERE clause with the actual condition that identifies Hospital Mode templates
-- in your Prompt Template Registry (e.g., a template_type column, a name pattern, etc.)
--
-- Example (adjust to match your schema):
--   UPDATE prompt_templates SET hospital_mode_template = TRUE
--   WHERE template_type = 'hospital_mode' OR name ILIKE '%hospital%';
--
-- ⚠️ DO NOT proceed to Sprint 2 generateLetter() instrumentation until this UPDATE is run
--    and confirmed. Document the result in the Sprint 1 security checklist.

-- ── Index ─────────────────────────────────────────────────────

-- generateLetter() pre-execution check: fetch memory config for a given template version
CREATE INDEX IF NOT EXISTS idx_pt_memory_enabled
  ON prompt_templates (id)
  WHERE memory_enabled = TRUE;

-- Hospital Mode firewall audit index
CREATE INDEX IF NOT EXISTS idx_pt_hospital_mode
  ON prompt_templates (id)
  WHERE hospital_mode_template = TRUE;

-- ── Column comments ───────────────────────────────────────────

COMMENT ON COLUMN prompt_templates.memory_enabled IS
  'Master switch for TIMS retrieval on this template. '
  'Default: FALSE — memory is OFF for all templates until explicitly enabled by Founder. '
  'Cannot be TRUE if hospital_mode_template = TRUE (constraint enforced).';

COMMENT ON COLUMN prompt_templates.allowed_memory_classes IS
  'Which memory classes may be retrieved for this template. '
  'Empty array = none (same as memory_enabled = FALSE). '
  'Valid values: strategy, recovery, optimization. '
  'Per MA-MEM-001 §6: Denial Decoder = [optimization]; Denial Fighter/Bill Dispute = all three.';

COMMENT ON COLUMN prompt_templates.max_memories_injected IS
  'Hard cap on memories injected per execution. '
  'Default: 2. Maximum allowed: 5. '
  'Cap is enforced in generateLetter() code, not just this config.';

COMMENT ON COLUMN prompt_templates.ymyl_sensitivity IS
  'Sensitivity level for this template. '
  'Controls which memories are eligible: only memories with ymyl_sensitivity <= template level are retrieved. '
  'Default: high (most restrictive).';

COMMENT ON COLUMN prompt_templates.memory_retrieval_strategy IS
  'Retrieval strategy. metadata_match = Phase 2 (available). '
  'hybrid = Phase 3+ only (pgvector required). '
  'Constraint prevents setting hybrid before Phase 3.';

COMMENT ON COLUMN prompt_templates.require_approved_status IS
  'If TRUE, only memories with memory_status = approved are eligible. '
  'Default: TRUE. Should never be FALSE in production.';

COMMENT ON COLUMN prompt_templates.hospital_mode_template IS
  'PERMANENT HOSPITAL MODE FIREWALL. '
  'If TRUE: memory injection is PERMANENTLY DISABLED regardless of memory_enabled. '
  'Cannot be overridden by memory_enabled = TRUE (constraint enforced at DB level + code level). '
  'Set to TRUE for ALL Hospital Mode templates in Sprint 1 (MEM-S1-07). '
  'This flag is irreversible without Founder + Kate + Phase 3+ legal review sign-off.';
