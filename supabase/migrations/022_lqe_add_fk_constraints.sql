-- MA-AUT-006 §G1: Add FK constraints to letter_quality_evaluations.
-- Migration 021 was manually applied via SQL editor without FK constraints
-- (artifacts table did not exist at time of manual apply).
-- Now that artifacts and cases tables are live, we add the constraints.

ALTER TABLE public.letter_quality_evaluations
  ADD CONSTRAINT letter_quality_evaluations_artifact_id_fkey
  FOREIGN KEY (artifact_id) REFERENCES public.artifacts(id) ON DELETE CASCADE;

ALTER TABLE public.letter_quality_evaluations
  ADD CONSTRAINT letter_quality_evaluations_case_id_fkey
  FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;
