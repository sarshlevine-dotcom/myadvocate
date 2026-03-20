# MyAdvocate n8n Content Flywheel Workflow v1

## Goal
Automate the path from content atom -> English draft -> review queue -> YouTube scheduling prep -> metrics loop -> Spanish candidate queue -> packaging into ebooks/toolkits.

This workflow is deliberately human-in-the-loop. It is not a zero-review publishing pipeline.

## Core design principles
- Founder remains final approver in v1
- Kate review is required for Spanish and tone-sensitive trust content
- Attorney review is reserved for higher-risk YMYL/legal-rights interpretations
- YouTube Studio remains final publishing layer
- Supabase is the system of record

## Main workflows
1. Content item intake
2. English draft generation
3. Review routing
4. Publish prep
5. Metrics sync
6. Spanish replication trigger
7. Packaging trigger for ebook/toolkit candidates

---

## Workflow 1: Content Item Intake

### Trigger options
- Manual webhook from internal admin form
- Supabase new row in `content_items`
- CSV import / Google Sheet seed import
- Scheduled ingestion from SEO backlog or denial-code backlog

### n8n nodes
1. Trigger
2. Normalize fields node
3. If node: validate required fields
4. Supabase upsert: `content_items`
5. Optional scoring node:
   - assign `priority_score`
   - assign `evergreen_score`
   - assign `monetization_candidate`
6. Notification node to founder: "New content item ready for draft generation"

### Required fields
- slug
- title_working
- pillar
- content_type
- source_asset_type

---

## Workflow 2: English Short Draft Generation

### Trigger
- Manual button / webhook
- Scheduled batch job for content items where:
  - status = `queued`
  - no English YouTube short exists

### n8n nodes
1. Trigger
2. Supabase query: fetch eligible `content_items`
3. Loop over items
4. Prompt builder node
5. Claude API node
6. Parse JSON response node
7. Supabase insert: `content_variants`
8. Supabase update: `content_items.status = drafted`
9. Slack/email/Telegram notification: batch draft complete

### Output written to `content_variants`
- channel = youtube
- format = short
- language = en
- variant_role = distribution
- title
- hook
- script_text
- description_text
- cta_text
- status = draft

### Batch rule
Run in batches of 10-15 to match your 1-2 week publishing cadence.

---

## Workflow 3: Review Routing

### Trigger
- New `content_variants` row with status = `draft`

### Logic
Route based on `content_items` flags:
- Founder review: always
- Kate review: if `requires_kate_review = true` OR language = `es`
- Attorney review: if `requires_attorney_review = true` OR ymyl_tier = 3

### n8n nodes
1. Trigger on new draft variant
2. Join node: fetch parent `content_item`
3. Switch node:
   - founder only
   - founder + Kate
   - founder + attorney
4. Notification node(s)
5. Supabase update: `content_variants.status = in_review`

### Review outcomes
Reviewer changes status manually or via webhook:
- approved
- needs_revision
- rejected

If needs revision:
- send back through prompt refinement route
- preserve previous version in `review_notes`

---

## Workflow 4: Publish Prep

### Trigger
- `content_variants.status = approved`

### What this workflow does
This does not auto-publish. It prepares the asset package:
- title
- description
- CTA
- thumbnail text
- UTM slug suggestion
- recommended publish date

### n8n nodes
1. Trigger
2. Build metadata node
3. Create export row node
4. Supabase update: `content_variants.status = produced`
5. Optional Google Drive / local export step for video ops
6. Notification: "Variant ready for YouTube Studio scheduling"

### Optional export targets
- CSV for upload operations
- Notion/Sheet publishing queue
- local JSON batch export

### Final manual step
Human uploads/schedules in YouTube Studio, then pastes back:
- external_url
- scheduled_at
- status = scheduled / published

---

## Workflow 5: Metrics Sync

### Trigger options
- Daily scheduled workflow
- Manual metrics refresh

### v1 approach
Use manual entry or CSV import first if API integration is not ready.

### Future approach
Pull from YouTube API and write snapshots to `content_metrics`.

### n8n nodes
1. Schedule trigger
2. Fetch published English YouTube variants
3. Pull metrics or import metrics CSV
4. Transform fields
5. Supabase insert into `content_metrics`
6. Compute `quality_score`
7. Optional update of parent `content_item` flags

### Suggested quality score inputs
- views 7d
- clicks 7d
- signups 7d
- retention rate
- founder override bonus

Example weighted score:
- 35% retention
- 25% clicks
- 20% signups
- 10% views
- 10% founder judgment override

---

## Workflow 6: Spanish Replication Trigger

### Trigger
- New or updated `content_metrics` on English YouTube short

### Eligibility logic
Mark content item as Spanish candidate if any of the following are true:
- views >= 500 in 7d
- clicks >= 10 in 7d
- signups >= 3 in 7d
- quality_score >= threshold
- manually marked strategic
- content item is tied to ebook/toolkit core theme

### n8n nodes
1. Trigger on metrics update
2. Fetch parent English variant + parent content item
3. If node: check eligibility thresholds
4. Supabase update: `content_items.translation_status = candidate`
5. Optional notification: "Spanish candidate detected"

### Spanish draft generation subworkflow
1. Trigger on `translation_status = candidate`
2. Fetch parent English variant
3. Build Spanish prompt with translation + localization instruction
4. Claude API node
5. Insert new `content_variants` row:
   - language = es
   - translation_parent_variant_id = English variant id
6. Route to founder + Kate review

---

## Workflow 7: Packaging Trigger for Ebooks and Toolkits

### Trigger
- Content item updated as:
  - ebook_candidate = true
  - toolkit_candidate = true
  - or repeated cluster threshold met

### Logic
Create packaging asset when one of these is true:
- 5+ related items in same monetizable cluster
- founder manually marks cluster ready
- top-performing set maps to one user problem with clear paid utility

### n8n nodes
1. Trigger on flag change or scheduled weekly scan
2. Query related `content_items` by pillar/content_type/target_query family
3. Aggregate cluster
4. If threshold met -> create `packaging_assets` record
5. Insert related rows into `packaging_asset_items`
6. Notify founder: "Toolkit/Ebook candidate cluster ready"

### Example packaging outputs
- Insurance Appeal Toolkit
- Hospital Bill Negotiation Toolkit
- First-Time Denial Survival Guide ebook
- Caregiver Escalation Guide toolkit

---

## Recommended v1 automations only
Build first:
- Workflow 1 intake
- Workflow 2 English draft generation
- Workflow 3 review routing
- Workflow 6 Spanish trigger
- Workflow 7 packaging trigger

Delay until later:
- full YouTube API sync
- direct publishing integration
- auto-thumbnail generation
- cross-post automation to all channels

---

## Suggested notification channels
- Telegram or email for review requests
- dashboard task list for queued approvals
- weekly founder digest for:
  - new drafts
  - Spanish candidates
  - toolkit/ebook candidate clusters

---

## Workflow state summary
### content_items
idea -> queued -> drafted -> in_review -> approved -> active

### content_variants
draft -> in_review -> approved -> produced -> scheduled -> published

### translation
not_eligible -> candidate -> approved_for_translation -> translated -> published_es

---

## Best first implementation order
1. Supabase tables live
2. Seed first 15-25 content items
3. Build English draft generation workflow
4. Build review routing
5. Publish first batch manually
6. Enter metrics manually
7. Turn on Spanish candidate detection
8. Start first toolkit/ebook cluster packaging
