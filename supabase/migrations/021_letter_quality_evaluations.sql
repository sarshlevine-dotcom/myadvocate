-- MA-AUT-006 §G1: Letter Quality Evaluator persistence layer.
-- Stores the result of every LQE run — all 3 sequential checks per artifact.
-- Written by generate-letter.ts (Gate 5) AFTER the evaluation, BEFORE artifact creation.
-- NEVER stores raw user IDs — user_id_hash is SHA-256 of the user UUID.

CREATE TABLE public.letter_quality_evaluations (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                  TIMESTAMPTZ NOT NULL    DEFAULT NOW(),

  -- References
  artifact_id                 UUID        REFERENCES public.artifacts(id) ON DELETE CASCADE,
  case_id                     UUID        NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  letter_type                 TEXT        NOT NULL
                                CHECK (letter_type IN (
                                  'denial_appeal',
                                  'bill_dispute',
                                  'hipaa_request',
                                  'negotiation_script'
                                )),

  -- Overall result
  passed                      BOOLEAN     NOT NULL,
  failure_reason              TEXT
                                CHECK (failure_reason IN (
                                  'DENIAL_CODE_ACCURACY_FAIL',
                                  'YMYL_SAFETY_FAIL',
                                  'LEGAL_FRAMING_FAIL'
                                )),
  iteration                   INT         NOT NULL DEFAULT 1
                                CHECK (iteration IN (1, 2)),  -- max 2 per MA-AUT-006 §G1

  -- Check 1 — Denial Code Accuracy
  dc_accuracy_passed          BOOLEAN     NOT NULL,
  dc_accuracy_score           FLOAT       NOT NULL CHECK (dc_accuracy_score >= 0 AND dc_accuracy_score <= 1),
  dc_accuracy_notes           TEXT,

  -- Check 2 — YMYL Safety
  ymyl_safety_passed          BOOLEAN     NOT NULL,
  ymyl_safety_score           FLOAT       NOT NULL CHECK (ymyl_safety_score >= 0 AND ymyl_safety_score <= 1),
  ymyl_safety_notes           TEXT,

  -- Check 3 — Legal Framing
  legal_framing_passed        BOOLEAN     NOT NULL,
  legal_framing_score         FLOAT       NOT NULL CHECK (legal_framing_score >= 0 AND legal_framing_score <= 1),
  legal_framing_notes         TEXT,

  -- Privacy — never the raw UUID (MA-SEC-002)
  user_id_hash                TEXT        NOT NULL,  -- SHA-256 of user UUID

  -- Escalation flag — set when LQE fails on iteration 2 and routes to Kate queue
  escalated_to_review         BOOLEAN     NOT NULL DEFAULT FALSE,

  CONSTRAINT chk_failure_reason_when_failed
    CHECK (passed = TRUE OR failure_reason IS NOT NULL)
);

-- Service role only — users never read or write their own evaluations.
-- No user-facing RLS policies. Admin reads via service role for Kate review queue.
ALTER TABLE public.letter_quality_evaluations ENABLE ROW LEVEL SECURITY;

-- Index: look up all evaluations for a given artifact quickly
CREATE INDEX idx_lqe_artifact_id ON public.letter_quality_evaluations (artifact_id);

-- Index: false positive rate monitoring — find all FAILS by letter type
CREATE INDEX idx_lqe_letter_type_passed ON public.letter_quality_evaluations (letter_type, passed);

-- Index: Kate's calibration queries — escalated items by date
CREATE INDEX idx_lqe_escalated ON public.letter_quality_evaluations (escalated_to_review, created_at DESC)
  WHERE escalated_to_review = TRUE;
