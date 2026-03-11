# Auth — Sharp Edge

Use Supabase Auth ONLY. No custom auth logic.
Magic link only — no passwords, no OAuth in Phase 1.
Session handling via @supabase/ssr middleware pattern.
Admin role = role column on users table, checked server-side only.
