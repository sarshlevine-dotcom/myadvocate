CREATE TABLE public.denial_codes (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                       TEXT NOT NULL UNIQUE,
  category                   TEXT NOT NULL CHECK (category IN ('labs', 'imaging', 'surgery', 'other')),
  plain_language_explanation TEXT NOT NULL,
  recommended_action         TEXT NOT NULL,
  source                     TEXT NOT NULL,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Public read, no RLS needed
