-- Migration: seo_fields_denial_codes
-- Adds Phase 2 SEO-enrichment columns to denial_codes.
-- These fields power GEO-optimized denial code pages and internal linking.
--
-- New columns:
--   target_keyword  TEXT     — Primary SEO keyword for this denial code page
--   search_volume   INTEGER  — Estimated monthly search volume (from keyword research)
--   tool_route      TEXT     — URL path to the primary CTA tool (e.g. /tools/denial-decoder)
--   cluster_id      TEXT     — Foreign reference to context_registry/seo_clusters.json
--
-- All nullable so existing rows remain valid until seed backfill runs.
-- No FK constraint on cluster_id — context_registry is JSON-only in Phase 2 (MA-CTX-001).

ALTER TABLE public.denial_codes
  ADD COLUMN IF NOT EXISTS target_keyword  TEXT,
  ADD COLUMN IF NOT EXISTS search_volume   INTEGER,
  ADD COLUMN IF NOT EXISTS tool_route      TEXT,
  ADD COLUMN IF NOT EXISTS cluster_id      TEXT;

-- Optional index: content engine queries will filter/order by cluster_id and search_volume
CREATE INDEX IF NOT EXISTS idx_denial_codes_cluster_id      ON public.denial_codes (cluster_id);
CREATE INDEX IF NOT EXISTS idx_denial_codes_search_volume   ON public.denial_codes (search_volume DESC NULLS LAST);
