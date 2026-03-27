-- Migration: cache_tables
-- L2 persistent cache tables for the three-layer caching system (SYSTEM.md).
-- L1: Redis (hot cache) — L2: Postgres (persistent, analytics source) — L3: SEO static pages.
-- These tables are write-targets for cache write-back and read-targets for hit analytics.

-- cache_entries: L2 persistent cache — mirrors Redis L1 for durability + analytics.
CREATE TABLE IF NOT EXISTS public.cache_entries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key    text        NOT NULL UNIQUE,
  value        jsonb       NOT NULL,
  ttl_seconds  integer     NOT NULL CHECK (ttl_seconds > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  CONSTRAINT cache_entries_expires_after_created CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_cache_entries_cache_key ON public.cache_entries (cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_entries_expires_at ON public.cache_entries (expires_at);

-- cache_logs: hit/miss analytics for the promotion flywheel (SYSTEM.md).
-- High hit_count entries are candidates for L3 SEO static page generation.
CREATE TABLE IF NOT EXISTS public.cache_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key  text        NOT NULL,
  hit        boolean     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cache_logs_cache_key ON public.cache_logs (cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_logs_created_at ON public.cache_logs (created_at);

-- cache_promotions: tracks keys promoted to L3 SEO static pages.
-- Populated by n8n promotion detector workflow (MA-CACHE-001).
CREATE TABLE IF NOT EXISTS public.cache_promotions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key    text        NOT NULL UNIQUE,
  hit_count    integer     NOT NULL DEFAULT 0,
  promoted_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cache_promotions_cache_key ON public.cache_promotions (cache_key);
