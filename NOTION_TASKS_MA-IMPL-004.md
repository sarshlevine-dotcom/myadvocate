# Notion Tasks — MA-IMPL-004 + MA-IMPL-005
## Content Flywheel, Admin Dashboard, Caching Architecture

---

## Sprint 1 — Deploy & Verify (This Week)

| Task ID | Task | Owner | Blocker | Status |
|---|---|---|---|---|
| MA-IMPL-004-T1-01 | Apply migration 024 (content_flywheel_and_tasks) to production Supabase | Sarsh | None | 🔲 Pending |
| MA-IMPL-004-T1-02 | Apply migration 025 (denial_codes_reconciliation) to production Supabase | Sarsh | 024 applied | 🔲 Pending |
| MA-IMPL-004-T1-03 | Set ADMIN_EMAILS env var in Vercel (sarsh.levine@gmail.com) | Sarsh | None | 🔲 Pending |
| MA-IMPL-004-T1-04 | Deploy branch feature/content-flywheel-foundation to Vercel | Sarsh | T1-01, T1-03 | 🔲 Pending |
| MA-IMPL-004-T1-05 | Run seed/002_content_items.sql — verify 20 content atoms loaded | Sarsh | T1-01 | 🔲 Pending |
| MA-IMPL-004-T1-06 | Run seed/003_tasks_seed.sql — verify 5 OpenHands tasks loaded | Sarsh | T1-01 | 🔲 Pending |
| MA-IMPL-004-T1-07 | Visit /admin — verify all 5 panels render with live data | Sarsh | T1-04, T1-05 | 🔲 Pending |
| MA-IMPL-004-T1-08 | Verify denial_codes table has new columns, no existing data lost | Sarsh | T1-02 | 🔲 Pending |
| MA-IMPL-004-T1-09 | Re-run eeat-validator.ts on co-16 + appeal page — confirm PASS | Sarsh | None | 🔲 Pending |
| MA-IMPL-004-T1-10 | Route both EEAT-fixed pages to Kate for clinical review | Sarsh | T1-09 | 🔲 Pending |
| MA-IMPL-004-T1-11 | Git commit + push feature/content-flywheel-foundation | Sarsh | All T1 code | 🔲 Pending |
| MA-IMPL-004-T1-12 | Open PR — reviewer: Sarsh — merge after post-deploy checklist passes | Sarsh | T1-11 | 🔲 Pending |

---

## Sprint 2 — Caching Infrastructure

| Task ID | Task | Owner | Blocker | Status |
|---|---|---|---|---|
| MA-IMPL-005-T2-01 | Write migration 026 (cache_entries, cache_logs, cache_promotions, cache_invalidation_events) | OpenHands | None | 🔲 Pending |
| MA-IMPL-005-T2-02 | Apply migration 026 to production Supabase | Sarsh | T2-01 | 🔲 Pending |
| MA-IMPL-005-T2-03 | Extend tracked-execution.ts — add optional CacheTrace fields (additive only, no existing fields touched) | OpenHands | None | 🔲 Pending |
| MA-IMPL-005-T2-04 | Wrap explainDenialCode() in L1 Redis cache lookup + write-back using CACHE_KEYS constants | OpenHands | T2-02 | 🔲 Pending |
| MA-IMPL-005-T2-05 | Wrap getPatientRights() + routeComplaint() in L1 Redis cache | OpenHands | T2-04 | 🔲 Pending |
| MA-IMPL-005-T2-06 | Deploy n8n Workflow A (cache lookup) | Sarsh | T2-02 | 🔲 Pending |
| MA-IMPL-005-T2-07 | Deploy n8n Workflow B (write-back) | Sarsh | T2-06 | 🔲 Pending |
| MA-IMPL-005-T2-08 | Deploy n8n Workflow C (invalidation listener) | Sarsh | T2-07 | 🔲 Pending |
| MA-IMPL-005-T2-09 | Wire cache hit rate + cost_saved_usd to Metrics panel in admin dashboard | OpenHands | T2-03 | 🔲 Pending |
| MA-IMPL-005-T2-10 | Verify cache hit on second call to explainDenialCode() — Redis key visible in Upstash dashboard | Sarsh | T2-04 | 🔲 Pending |

---

## Sprint 2-3 — Content Engine

| Task ID | Task | Owner | Blocker | Status |
|---|---|---|---|---|
| MA-IMPL-004-T3-01 | Import seed_pages.json (10 pages) as content_items + initial content_variants | OpenHands | 024 applied | 🔲 Pending |
| MA-IMPL-004-T3-02 | Add prompt_templates seed rows: EN Short + Spanish localization prompts | Sarsh | 024 applied | 🔲 Pending |
| MA-IMPL-004-T3-03 | Wire prompt_templates table to generateLetter() — phased: new prompts only, existing hardcoded prompts not touched yet | OpenHands | T3-02 | 🔲 Pending |
| MA-IMPL-004-T3-04 | Deploy n8n Workflow 1 (content item intake — create content_item row from structured input) | Sarsh | 024 applied | 🔲 Pending |
| MA-IMPL-004-T3-05 | Deploy n8n Workflow 2 (EN draft generation via generateLetter() — all 7 gates active) | Sarsh | T3-04, T3-02 | 🔲 Pending |
| MA-IMPL-004-T3-06 | Deploy n8n Workflow 3 (review routing — founder/Kate/attorney gate based on review_level field) | Sarsh | T3-05 | 🔲 Pending |
| MA-IMPL-004-T3-07 | Generate first 10 EN Short variants from 10 content_items — review in admin Content Queue panel | Sarsh | T3-06 | 🔲 Pending |
| MA-IMPL-004-T3-08 | Kate clinical review: medical-necessity-denial.md + administrative-denial.md hub pages | Kate | EEAT PASS ✅ | 🔲 Pending |
| MA-IMPL-004-T3-09 | Set up Beehiiv integration for newsletter capture | Sarsh | Beehiiv account | 🔲 Pending |
| MA-IMPL-004-T3-10 | Verify MetricsEntryForm + PackagingAssetForm work end-to-end against live DB | Sarsh | T1-07 | 🔲 Pending |

---

## Month 2+ — Content Production Automation

| Task ID | Task | Owner | Blocker | Status |
|---|---|---|---|---|
| MA-IMPL-004-T4-01 | Deploy n8n Workflows 4-7 (publish prep, metrics logging, Spanish candidate trigger, packaging cluster) | Sarsh | 10+ published variants, metrics data in DB | 🔲 Deferred |
| MA-IMPL-004-T4-02 | Spanish candidate detection — auto-flag content_items above quality threshold | OpenHands | SCAA gate (MA-AUT-006 §G7), 30 days metrics | 🔲 Deferred |
| MA-IMPL-004-T4-03 | n8n Workflows D-F (cache promotion detector, cost-savings digest, stale sweeper) | Sarsh | 30+ days L2 cache data | 🔲 Deferred |
| MA-IMPL-004-T4-04 | YouTube batch production — EN Short batch generation → founder review → publish queue | Sarsh | prompt_templates in DB, 10+ content_items published | 🔲 Deferred |

---

## Completed (2026-03-20)

| Task ID | Task | Completed |
|---|---|---|
| MA-IMPL-004-DONE-01 | Create migration 024 (content flywheel — 9 tables) | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-02 | Create migration 025 (denial_codes reconciliation — additive) | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-03 | Install 7 admin panel components from code_pack_v2 | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-04 | Add src/lib/admin/getDashboardData.ts | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-05 | Add src/app/actions/admin.ts server actions | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-06 | Add middleware.ts (Supabase SSR auth — replaces placeholder) | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-07 | Add src/lib/cache-keys.ts (Redis conventions + TTL + isCacheEligible) | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-08 | Add seed/002_content_items.sql (20 atoms) | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-09 | Add seed/003_tasks_seed.sql (5 OpenHands tasks) | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-10 | Scaffold 4 context_registry JSON files | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-11 | Fix EEAT failure: co-16 (Layer 2 citations) — eeat_validated: true | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-12 | Fix EEAT failure: appeal pillar (Layer 2 citations + Layer 3 forbidden claim) — eeat_validated: true | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-13 | Update CLAUDE.md (Data Model Delineation, migrations, repo map, canonical docs, staleness date) | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-14 | Create PMP v29 (supersedes v24, catches up v25-v28, adds §9 + §10 + all new workstreams) | ✅ 2026-03-20 |
| MA-IMPL-004-DONE-15 | Create MA-IMPL-004 Integration Analysis report (docs/intelligence/) | ✅ 2026-03-20 |
