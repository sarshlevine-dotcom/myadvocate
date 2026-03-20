# GitHub Commit — MA-IMPL-004 Content Flywheel + MA-IMPL-005 Caching + PMP v29

## Commit Message

```
feat: content flywheel DB + admin dashboard + caching foundation + PMP v29 (MA-IMPL-004/005)

- Add migration 024: content_items, content_variants, content_metrics,
  packaging_assets, packaging_asset_items, tasks, task_runs,
  prompt_templates (9 tables, 7 enums, triggers, indexes, rollup view)
- Add migration 025: denial_codes reconciliation — additive columns only
  (title, seo_slug, risk_notes, review_status, plain_language_meaning,
  recommended_next_step) — no drops, no renames
- Add middleware.ts: Supabase SSR admin route guard (replaces placeholder)
- Add src/app/admin/layout.tsx + page.tsx: 5-panel founder dashboard
- Add 7 admin panel components: LaunchBlockers, OpenHandsQueue,
  ContentQueue, Monetization, Metrics, MetricsEntryForm, PackagingAssetForm
- Add src/lib/admin/getDashboardData.ts: server-side data loader
- Add src/app/actions/admin.ts: markSpanishCandidate, createPackagingAsset,
  createMetricEntry server actions
- Add src/lib/cache-keys.ts: Redis key conventions + TTL + isCacheEligible
- Add seed/002_content_items.sql (20 atoms) + 003_tasks_seed.sql (5 tasks)
- Scaffold 4 context_registry JSON files: ranked_queue.json,
  payer_intelligence.json, book_keyword_signals.json,
  spanish_keyword_signals.json
- Fix EEAT Layer 2 (citations) on co-16-missing-invalid-information.md
- Fix EEAT Layer 2+3 (citations + forbidden claim) on
  how-to-appeal-insurance-denial.md — both now eeat_validated: true
- Update CLAUDE.md: Data Model Delineation section, migrations 024+025+026,
  repo map, canonical docs (MA-IMPL-004, MA-IMPL-005, PMP v29 ref)
- Add docs/pmp/MyAdvocate_PMP_v29.docx: supersedes v24, integrates all
  workstreams since v24 (MA-IMPL-001 through MA-IMPL-005, MA-AGT-002)
- Add docs/intelligence/MA-IMPL-004_Integration_Analysis_2026-03-20.docx

Closes: MA-IMPL-004 Tier 1 + MA-IMPL-005 Foundation
```

## Branch Name
```
feature/content-flywheel-foundation
```

## Files Changed

### New Files (31)
```
supabase/migrations/024_content_flywheel_and_tasks.sql
supabase/migrations/025_denial_codes_reconciliation.sql
supabase/seed/002_content_items.sql
supabase/seed/003_tasks_seed.sql
middleware.ts
src/app/admin/layout.tsx
src/app/admin/page.tsx
src/app/actions/admin.ts
src/components/admin/LaunchBlockersPanel.tsx
src/components/admin/OpenHandsQueuePanel.tsx
src/components/admin/ContentQueuePanel.tsx
src/components/admin/MonetizationPanel.tsx
src/components/admin/MetricsPanel.tsx
src/components/admin/MetricsEntryForm.tsx
src/components/admin/PackagingAssetForm.tsx
src/lib/admin/getDashboardData.ts
src/lib/cache-keys.ts
context_registry/ranked_queue.json
context_registry/payer_intelligence.json
context_registry/book_keyword_signals.json
context_registry/spanish_keyword_signals.json
docs/pmp/MyAdvocate_PMP_v29.docx
docs/intelligence/MA-IMPL-004_Integration_Analysis_2026-03-20.docx
GITHUB_COMMIT_MA-IMPL-004.md
```

### Modified Files (7)
```
CLAUDE.md — Data Model Delineation, repo map, migrations, canonical docs, staleness date, Recent Changes
content_drafts/codes/co-16-missing-invalid-information.md — EEAT Layer 2 fixed, eeat_validated: true
content_drafts/pillars/how-to-appeal-insurance-denial.md — EEAT Layer 2+3 fixed, eeat_validated: true
content_drafts/validation_failures/co-16-missing-invalid-information-FAIL.md — resolved
content_drafts/validation_failures/how-to-appeal-insurance-denial-FAIL.md — resolved
```

## Pre-Commit Checklist
- [ ] npm run lint — passes
- [ ] npm test — passes (no new test files; existing 199 tests should still pass)
- [ ] Verify migration 024 SQL is valid (run locally against Supabase before pushing to prod)
- [ ] Verify migration 025 SQL is valid
- [ ] Confirm ADMIN_EMAILS env var is set in Vercel before deploying middleware.ts
- [ ] Confirm eeat-validator.ts passes on both fixed content files

## Post-Deploy Checklist (after migrations applied to production Supabase)
- [ ] Run seed/002_content_items.sql — 20 content atoms loaded
- [ ] Run seed/003_tasks_seed.sql — 5 OpenHands tasks loaded
- [ ] Visit /admin — verify all 5 panels render
- [ ] Verify content_item_rollup view returns rows
- [ ] Verify denial_codes table has new columns without data loss
