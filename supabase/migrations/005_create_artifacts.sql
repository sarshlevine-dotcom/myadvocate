-- MA-DAT-002: ARTIFACT — generated letters, gated behind founder review
CREATE TABLE public.artifacts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id            UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  artifact_type      TEXT NOT NULL DEFAULT 'denial_appeal'
                       CHECK (artifact_type IN ('denial_appeal')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  release_state      TEXT NOT NULL DEFAULT 'draft'
                       CHECK (release_state IN ('draft', 'review_required', 'released', 'archived')),
  disclaimer_version TEXT NOT NULL,
  content_hash       TEXT NOT NULL,
  storage_path       TEXT NOT NULL
);

-- RLS: direct user_id check (MA-SEC-002 P10)
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own artifacts"
  ON public.artifacts FOR SELECT
  USING (auth.uid() = user_id);

-- No user INSERT policy — artifacts created server-side only via service role
