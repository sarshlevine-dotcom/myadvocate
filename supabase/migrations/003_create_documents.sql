-- MA-DAT-002: DOCUMENT object
CREATE TABLE public.documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id               UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  file_type             TEXT NOT NULL CHECK (file_type IN ('pdf', 'jpg', 'png')),
  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parse_status          TEXT NOT NULL DEFAULT 'pending'
                          CHECK (parse_status IN ('pending', 'parsed', 'failed', 'unsupported')),
  extraction_confidence DECIMAL(4,3),
  storage_path          TEXT NOT NULL
);

-- RLS (MA-SEC-002 P10) — join through cases to enforce user ownership
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON public.documents FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.cases WHERE cases.id = documents.case_id AND cases.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases WHERE cases.id = documents.case_id AND cases.user_id = auth.uid())
  );
