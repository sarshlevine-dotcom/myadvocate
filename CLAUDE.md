# MyAdvocate — Project Context

## Why
AI-powered patient advocacy platform. Helps people navigate insurance denials and medical billing disputes. Phase 1 MVP.

## Repo Map
- `src/app/` — Next.js App Router pages and API routes
- `src/lib/` — core utilities: Supabase clients, db helpers, pii-scrubber, generateLetter, disclaimer
- `src/types/` — TypeScript types for all 10 domain objects
- `src/components/` — shared UI components
- `supabase/migrations/` — all DB migrations (never edit past migrations)
- `supabase/seed/` — seed data for denial codes and resource routes
- `docs/superpowers/` — specs and plans

## Rules
- NEVER skip PII scrubbing before Anthropic API calls (see src/lib/pii-scrubber.ts)
- NEVER auto-release artifacts — release_state must pass through review_required
- NEVER add freeform text fields to the Case object
- NEVER commit .env files
- NEVER edit past migrations — create new ones instead
- Check MA-LCH-004 before building any new feature (scope gate)
- Check MA-SEC-002 before any feature touching user data

## Key Commands
- `npm run dev` — start dev server
- `npm test` — run tests
- `supabase start` — start local Supabase (requires Docker)
- `supabase db push` — apply migrations
- `supabase gen types typescript --local > src/types/supabase.ts` — regenerate types

## Canonical Docs
- MA-LCH-004 (Launch Truth) — what ships in Phase 1
- MA-SEC-002 (Security Checklist) — 20 controls, all must PASS
- MA-DAT-002 (Data Model) — 10 objects, minimum fields
- docs/superpowers/specs/2026-03-10-myadvocate-mvp-build-design.md — approved spec
