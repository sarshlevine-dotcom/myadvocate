-- SEO backfill seed — Phase 2 SEO fields for all 37 denial codes
-- Adds: target_keyword, search_volume, tool_route, cluster_id
--
-- Idempotent: uses UPDATE … WHERE code = '…' — safe to re-run.
-- Runs after denial_codes.sql (base seed) and migration 018 (adds columns).
--
-- search_volume: estimated monthly US searches (keyword research baseline, Phase 2 refresh).
-- tool_route: URL path to primary CTA tool for this code's content page.
-- cluster_id: foreign reference to context_registry/seo_clusters.json (JSON-only in Phase 2).
--
-- Cluster map:
--   cluster_0001  Medical Necessity Denial Appeals      (code-cluster under cluster_0008)
--   cluster_0002  Prior Authorization Denials           (code-cluster under cluster_0008)
--   cluster_0004  Medical Bill Dispute and Negotiation  (code-cluster under cluster_0007)
--   cluster_0007  Administrative Denial Category Hub    (mid-tier hub)
--   cluster_0008  Medical Necessity Category Hub        (mid-tier hub)
--   cluster_0009  Coverage and Network Denial Hub       (mid-tier hub)

-- ── CO SERIES ────────────────────────────────────────────────────────────────

UPDATE public.denial_codes SET
  target_keyword = 'CO-1 insurance denial deductible not met',
  search_volume  = 800,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0004'
WHERE code = 'CO-1';

UPDATE public.denial_codes SET
  target_keyword = 'CO-2 insurance denial coinsurance amount',
  search_volume  = 600,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0004'
WHERE code = 'CO-2';

UPDATE public.denial_codes SET
  target_keyword = 'CO-3 insurance denial co-payment required',
  search_volume  = 500,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0004'
WHERE code = 'CO-3';

UPDATE public.denial_codes SET
  target_keyword = 'CO-4 insurance denial coverage limit exceeded',
  search_volume  = 400,
  tool_route     = '/tools/denial-decoder',
  cluster_id     = 'cluster_0009'
WHERE code = 'CO-4';

UPDATE public.denial_codes SET
  target_keyword = 'CO-11 insurance denial how to fix',
  search_volume  = 300,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-11';

UPDATE public.denial_codes SET
  target_keyword = 'CO-16 insurance denial missing information appeal',
  search_volume  = 1200,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-16';

UPDATE public.denial_codes SET
  target_keyword = 'CO-22 insurance denial coordination of benefits dispute',
  search_volume  = 900,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-22';

UPDATE public.denial_codes SET
  target_keyword = 'CO-24 insurance denial charges exceed fee schedule',
  search_volume  = 500,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-24';

UPDATE public.denial_codes SET
  target_keyword = 'CO-27 insurance denial timely filing limit exceeded',
  search_volume  = 800,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-27';

UPDATE public.denial_codes SET
  target_keyword = 'CO-29 insurance denial timely filing exceeded appeal',
  search_volume  = 1500,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-29';

UPDATE public.denial_codes SET
  target_keyword = 'CO-45 insurance denial charge exceeds fee schedule',
  search_volume  = 2200,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-45';

-- CO-50: highest search volume denial code in the dataset
UPDATE public.denial_codes SET
  target_keyword = 'CO-50 insurance denial not medically necessary appeal',
  search_volume  = 18000,
  tool_route     = '/tools/appeal-generator',
  cluster_id     = 'cluster_0001'
WHERE code = 'CO-50';

UPDATE public.denial_codes SET
  target_keyword = 'CO-55 insurance denial inconsistent procedure diagnosis',
  search_volume  = 400,
  tool_route     = '/tools/denial-decoder',
  cluster_id     = 'cluster_0009'
WHERE code = 'CO-55';

UPDATE public.denial_codes SET
  target_keyword = 'CO-96 insurance denial non-covered charge appeal',
  search_volume  = 3500,
  tool_route     = '/tools/denial-decoder',
  cluster_id     = 'cluster_0009'
WHERE code = 'CO-96';

UPDATE public.denial_codes SET
  target_keyword = 'CO-97 insurance denial bundled code dispute',
  search_volume  = 2800,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-97';

UPDATE public.denial_codes SET
  target_keyword = 'CO-109 insurance denial submitted to wrong payer',
  search_volume  = 700,
  tool_route     = '/tools/denial-decoder',
  cluster_id     = 'cluster_0009'
WHERE code = 'CO-109';

UPDATE public.denial_codes SET
  target_keyword = 'CO-119 insurance denial benefit maximum reached',
  search_volume  = 600,
  tool_route     = '/tools/denial-decoder',
  cluster_id     = 'cluster_0009'
WHERE code = 'CO-119';

-- CO-151 / CO-197: Prior Authorization cluster (highest referral potential)
UPDATE public.denial_codes SET
  target_keyword = 'CO-151 insurance denial prior authorization required appeal',
  search_volume  = 4500,
  tool_route     = '/tools/appeal-generator',
  cluster_id     = 'cluster_0002'
WHERE code = 'CO-151';

UPDATE public.denial_codes SET
  target_keyword = 'CO-167 insurance denial diagnosis inconsistent with procedure',
  search_volume  = 500,
  tool_route     = '/tools/appeal-generator',
  cluster_id     = 'cluster_0008'
WHERE code = 'CO-167';

UPDATE public.denial_codes SET
  target_keyword = 'CO-170 insurance adjustment payment applied to copay',
  search_volume  = 300,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-170';

UPDATE public.denial_codes SET
  target_keyword = 'CO-197 insurance denial prior authorization not obtained',
  search_volume  = 3800,
  tool_route     = '/tools/appeal-generator',
  cluster_id     = 'cluster_0002'
WHERE code = 'CO-197';

UPDATE public.denial_codes SET
  target_keyword = 'CO-200 insurance adjustment contractual obligation',
  search_volume  = 350,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-200';

UPDATE public.denial_codes SET
  target_keyword = 'CO-234 insurance denial subrogation coordination of benefits',
  search_volume  = 250,
  tool_route     = '/tools/denial-decoder',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-234';

UPDATE public.denial_codes SET
  target_keyword = 'CO-242 insurance denial claim not paid review',
  search_volume  = 200,
  tool_route     = '/tools/denial-decoder',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-242';

UPDATE public.denial_codes SET
  target_keyword = 'CO-253 insurance denial sequestration adjustment',
  search_volume  = 150,
  tool_route     = '/tools/denial-decoder',
  cluster_id     = 'cluster_0007'
WHERE code = 'CO-253';

-- ── OA SERIES ────────────────────────────────────────────────────────────────

UPDATE public.denial_codes SET
  target_keyword = 'OA-1 insurance adjustment deductible patient responsibility',
  search_volume  = 450,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0004'
WHERE code = 'OA-1';

UPDATE public.denial_codes SET
  target_keyword = 'OA-2 insurance adjustment coinsurance amount',
  search_volume  = 350,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0004'
WHERE code = 'OA-2';

UPDATE public.denial_codes SET
  target_keyword = 'OA-18 insurance denial duplicate claim adjustment',
  search_volume  = 600,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'OA-18';

UPDATE public.denial_codes SET
  target_keyword = 'OA-23 insurance denial timely filing other adjustment',
  search_volume  = 400,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'OA-23';

-- ── PR SERIES ────────────────────────────────────────────────────────────────

UPDATE public.denial_codes SET
  target_keyword = 'PR-1 medical bill patient deductible responsibility',
  search_volume  = 1200,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0004'
WHERE code = 'PR-1';

UPDATE public.denial_codes SET
  target_keyword = 'PR-2 medical bill coinsurance patient responsibility',
  search_volume  = 900,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0004'
WHERE code = 'PR-2';

UPDATE public.denial_codes SET
  target_keyword = 'PR-3 medical bill co-payment patient responsibility',
  search_volume  = 750,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0004'
WHERE code = 'PR-3';

UPDATE public.denial_codes SET
  target_keyword = 'PR-26 medical bill non-covered service patient responsibility',
  search_volume  = 500,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0004'
WHERE code = 'PR-26';

UPDATE public.denial_codes SET
  target_keyword = 'PR-27 medical bill coverage terminated claim denied',
  search_volume  = 400,
  tool_route     = '/tools/denial-decoder',
  cluster_id     = 'cluster_0004'
WHERE code = 'PR-27';

UPDATE public.denial_codes SET
  target_keyword = 'PR-31 insurance claim patient cannot be identified fix',
  search_volume  = 280,
  tool_route     = '/tools/bill-dispute',
  cluster_id     = 'cluster_0007'
WHERE code = 'PR-31';

UPDATE public.denial_codes SET
  target_keyword = 'PR-96 medical bill non-covered charge patient pays',
  search_volume  = 380,
  tool_route     = '/tools/denial-decoder',
  cluster_id     = 'cluster_0009'
WHERE code = 'PR-96';

UPDATE public.denial_codes SET
  target_keyword = 'PR-204 insurance denial not covered under plan appeal',
  search_volume  = 2100,
  tool_route     = '/tools/denial-decoder',
  cluster_id     = 'cluster_0009'
WHERE code = 'PR-204';
