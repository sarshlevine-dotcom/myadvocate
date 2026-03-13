# content_drafts/

Staging area for all SEO content before publish. Every file here has passed the 5-layer EEAT automated safety stack and is awaiting human review + EEAT attorney gate clearance before going live.

## Directory Structure

| Folder | Contents |
|--------|---------|
| `pillars/` | Top-tier evergreen pages. Link everything down from here. |
| `hubs/` | Mid-tier category hub pages (Administrative, Medical Necessity, Coverage/Network). |
| `codes/` | Individual denial code pages (CO-16, CO-50, etc.) |
| `supporting/` | Bridge pages, rights explainers, HIPAA guides, etc. |

## File Naming Convention

`{url-slug}.md` — matches the `url_slug` field in `context_registry/content_pages.json`.

Example: `how-to-appeal-insurance-denial.md` → `/how-to-appeal-insurance-denial`

## Frontmatter Schema

Every draft file uses this frontmatter:

```yaml
---
page_id: page_0006
publish_sequence: 1
status: draft_complete          # draft_in_progress | draft_complete | review_passed | publish_ready
tier: pillar                    # pillar | category_hub | code_page | supporting
cluster_id: cluster_0006
hub_cluster_id: null
denial_category: all
tool_route: insurance_appeal_generator
review_level: clinical_review_needed   # founder_review | clinical_review_needed
brand_stat_required: true
eeat_validated: false           # flip to true when 5-layer stack passes
clinical_reviewed: false        # flip to true when LPN/LVN reviewer confirms
attorney_gate_cleared: false    # flip to true when trust pages are live
publish_ready: false            # true only when all three above are true
target_keyword: "how to appeal insurance denial"
word_count: 0
generated_at: 2026-03-12
---
```

## Publish Checklist (Per Page)

Before any page goes live:

- [ ] `eeat_validated: true` — passed `scripts/validate-content.ts`
- [ ] `clinical_reviewed: true` — LPN/LVN reviewer confirmed (required for clinical_review_needed pages)
- [ ] `attorney_gate_cleared: true` — all 7 trust pages are attorney-reviewed and live (MA-EEAT-001 §5.1)
- [ ] `publish_ready: true` — only set this after all three above

## Generation Order (publish_sequence)

See `docs/seo/MA-SEO-001_90Day_Publishing_Queue.md` for full queue.
Top priority: page_0006 (pillar) → page_0004 (bill dispute pillar) → page_0010 (CO-16) → page_0001 (CO-50).
