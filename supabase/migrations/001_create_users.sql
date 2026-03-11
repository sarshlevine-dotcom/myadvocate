-- MA-DAT-002: USER object
-- Extends Supabase auth.users with app-specific fields
CREATE TABLE public.users (
  id                         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                      TEXT NOT NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subscription_status        TEXT NOT NULL DEFAULT 'free'
                               CHECK (subscription_status IN ('free', 'active', 'canceled')),
  role                       TEXT NOT NULL DEFAULT 'user'
                               CHECK (role IN ('user', 'admin')),
  email_capture_consented_at TIMESTAMPTZ
);

-- RLS (MA-SEC-002 P10)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own record"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own record"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
