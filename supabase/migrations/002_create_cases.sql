-- MA-DAT-002: CASE object — core routing object for every user problem
CREATE TABLE public.cases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issue_type   TEXT NOT NULL CHECK (issue_type IN ('denial', 'billing', 'access')),
  state        TEXT NOT NULL CHECK (state IN ('CA', 'TX', 'NY')),
  status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'in_progress', 'completed', 'archived')),
  entry_source TEXT NOT NULL DEFAULT 'direct'
                 CHECK (entry_source IN ('denial_decoder', 'direct', 'seo')),
  review_state TEXT NOT NULL DEFAULT 'not_required'
                 CHECK (review_state IN ('not_required', 'pending', 'approved'))
);

-- RLS (MA-SEC-002 P10)
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cases"
  ON public.cases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cases"
  ON public.cases FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases"
  ON public.cases FOR UPDATE USING (auth.uid() = user_id);
