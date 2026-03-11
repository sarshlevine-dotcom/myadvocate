-- MA-DAT-002: REVIEW_QUEUE — founder review for artifacts and flagged extractions
CREATE TABLE public.review_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  case_id     UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID REFERENCES public.users(id),
  decision    TEXT NOT NULL DEFAULT 'pending'
                CHECK (decision IN ('pending', 'approved', 'rejected', 'edited')),
  risk_reason TEXT,
  CONSTRAINT risk_reason_required_on_rejection
    CHECK (decision NOT IN ('rejected', 'edited') OR risk_reason IS NOT NULL)
);

-- RLS: admin only — no user-level RLS
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;
-- Note: admin access enforced at API route level (role check), not DB RLS
-- Admins use service role client which bypasses RLS
