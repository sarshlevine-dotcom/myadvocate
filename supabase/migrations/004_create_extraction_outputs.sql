-- MA-DAT-002: EXTRACTION_OUTPUT — parsed document data, PII scrubbed
CREATE TABLE public.extraction_outputs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id        UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  case_id            UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  extracted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence_score   DECIMAL(4,3) NOT NULL,
  flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  scrubbed_payload   JSONB NOT NULL DEFAULT '{}'
);

-- RLS: direct user_id check (denormalized for performance — MA-SEC-002 P10)
ALTER TABLE public.extraction_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own extraction outputs"
  ON public.extraction_outputs FOR SELECT
  USING (auth.uid() = user_id);
