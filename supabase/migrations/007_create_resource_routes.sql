CREATE TABLE public.resource_routes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code    TEXT NOT NULL CHECK (state_code IN ('CA', 'TX', 'NY')),
  issue_type    TEXT NOT NULL CHECK (issue_type IN ('denial', 'billing', 'access')),
  resource_name TEXT NOT NULL,
  url           TEXT NOT NULL,
  verified_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);
-- No RLS — public read, admin write via service role
