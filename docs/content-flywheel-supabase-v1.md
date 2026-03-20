# MyAdvocate Content Flywheel + Supabase v1

## Purpose
This document defines the minimum viable Supabase-first content operating system for MyAdvocate before YouTube goes live, while preserving clean expansion paths into Spanish, ebooks, toolkits, blog, email, and future channel variants.

## Why Supabase before YouTube
Supabase should be implemented before YouTube launch because the business is already converging on a structured content flywheel:
- English Shorts as the testing lane
- Spanish as a delayed replication lane
- SEO articles and denial-code pages as canonical source assets
- Email, ebooks, and toolkits as monetization layers
- Human review gates for YMYL-sensitive outputs

Without a structured content database, the team risks topic duplication, status confusion, translation drift, weak review discipline, and fragmented monetization packaging.

## Core strategic principle
One content spine should power many outputs.

A single core content atom can feed:
- English YouTube Short
- Spanish YouTube Short
- blog article or article section
- newsletter snippet
- ebook chapter candidate
- toolkit module
- product onboarding content
- social quote / caption assets

This is the flywheel. The business should not create separate ideation systems for each channel.

## Early revenue implication
Ebooks and toolkits are major early revenue sources. That means the content system must do more than track video publishing. It must also support packaging, bundling, and identifying which repeated user problems can be transformed into paid written assets.

Examples:
- Denial-code content cluster -> Denial Decoder pages -> appeal scripts -> paid appeal toolkit
- Medical billing cluster -> Shorts + article -> negotiation checklist -> paid hospital bill dispute toolkit
- Nursing-home / caregiver cluster -> resource content -> complaint flow -> paid caregiver escalation toolkit
- Founder voice / emotional reality clips -> trust building -> newsletter -> premium written guide / field manual

## Recommended architecture
Start with Supabase v1 before YouTube launch.

### v1 scope
Only build what launch needs:
- content items
- content variants
- content metrics
- review states
- translation eligibility
- monetization tags

Do not build a full CMS or publishing platform first.

## Content flywheel stages
1. Source asset identification
2. Content atom creation
3. Draft generation
4. Review routing
5. Variant production
6. Publish scheduling
7. Metrics collection
8. Expansion / packaging
9. Monetization conversion into ebook, toolkit, or premium written product

## Canonical source asset types
Every `content_item` should come from one or more source assets:
- SEO cluster topic
- denial code database
- rights library / legal content DB
- tool flow / product feature
- founder insight bank
- FAQ / support question bank
- patient story pattern bank
- outcome data insight

These source assets become the raw material for all downstream variants.

## Core Supabase tables

### 1) content_items
One row per core content atom.

Suggested fields:
- id
- slug
- title_working
- summary
- pillar
- content_type
- source_asset_type
- source_asset_id
- target_query
- language_origin
- ymyl_tier
- review_level
- requires_founder_review
- requires_kate_review
- requires_attorney_review
- monetization_role
- monetization_candidate
- ebook_candidate
- toolkit_candidate
- newsletter_candidate
- translation_status
- status
- priority_score
- evergreen_score
- cta_target
- canonical_url_target
- notes
- created_at
- updated_at

### 2) content_variants
One row per output variant.

Examples:
- English YouTube Short
- Spanish YouTube Short
- Instagram Reel
- newsletter snippet
- ebook outline section
- toolkit lesson block

Suggested fields:
- id
- content_item_id
- channel
- format
- language
- variant_role
- title
- hook
- script_text
- description_text
- cta_text
- thumbnail_text
- status
- scheduled_at
- published_at
- external_url
- translation_parent_variant_id
- production_notes
- review_notes
- created_at
- updated_at

### 3) content_metrics
Metrics by variant.

Suggested fields:
- id
- variant_id
- window_type
- views
- clicks
- signups
- paid_conversions
- save_rate
- retention_rate
- comments
- shares
- quality_score
- synced_at

### 4) packaging_assets
Tracks which content atoms or variants roll up into ebooks and toolkits.

Suggested fields:
- id
- asset_type
- title_working
- status
- target_audience
- monetization_stage
- packaging_notes
- created_at
- updated_at

### 5) packaging_asset_items
Join table between `packaging_assets` and `content_items`.

Suggested fields:
- id
- packaging_asset_id
- content_item_id
- role_in_asset
- sequence_order
- notes

This is the missing piece that allows early written-product revenue to use the same content spine instead of becoming a separate project.

## Status model
Keep status simple at launch.

For `content_items`:
- idea
- queued
- drafted
- in_review
- approved
- active
- archived

For `content_variants`:
- draft
- in_review
- approved
- produced
- scheduled
- published
- failed
- archived

For translation:
- not_eligible
- candidate
- approved_for_translation
- translated
- published_es

## Review routing
The system should route review based on YMYL sensitivity and monetization role.

Suggested logic:
- Founder review: always required before publish in v1
- Kate review: required for Spanish, trust-sensitive, or higher-emotion assets
- Attorney review: only for assets tied to sensitive legal rights interpretation, specific state rights, or future hospital-mode style content

This keeps launch safe without building an overly complex approval system.

## English -> Spanish replication rule
Do not translate everything.

Use Spanish as a delayed replication engine.

Recommended rule for first 90 days:
A content variant becomes Spanish-eligible if any of the following are true:
- views_7d >= threshold
- clicks >= threshold
- signups >= threshold
- manually marked strategic
- directly tied to a core evergreen toolkit / ebook theme

This ensures Spanish follows proven winners plus strategic monetization themes, not random volume.

## Ebooks and toolkits in the flywheel
This is a core design requirement, not a future nice-to-have.

### Ebook role
Ebooks should emerge from repeated high-performing, trust-building clusters.
Examples:
- The first-time insurance denial playbook
- The medical bill survival guide
- The caregiver escalation guide

### Toolkit role
Toolkits should emerge from action-heavy clusters with repeat user intent.
Examples:
- Insurance appeal toolkit
- Hospital bill negotiation toolkit
- Nursing home complaint toolkit
- Doctor-dismissal response toolkit

### How the system should support this
Every content item should be labelable as:
- educational only
- trust-building
- conversion-supporting
- ebook candidate
- toolkit candidate
- bundle core

This lets you identify monetization opportunities early rather than trying to reconstruct them later.

## Minimum v1 workflows

### Workflow 1: source asset -> content item
Input from SEO plan, denial code DB, tool flow, or idea bank.
Create a content item in Supabase.

### Workflow 2: content item -> English Short draft
AI generates hook, script, title, description, CTA.
Write draft into `content_variants`.

### Workflow 3: review routing
Move the draft into founder review.
If flagged for Spanish-sensitive wording or trust complexity, also route to Kate review.

### Workflow 4: scheduling
Approved variant moves to production and scheduling queue.
YouTube Studio remains final publishing layer.

### Workflow 5: metrics sync
Pull early performance back into `content_metrics`.
Use those metrics to trigger:
- Spanish candidate status
- ebook candidate status
- toolkit candidate status

### Workflow 6: packaging
When several content items cluster around one monetizable user problem, create a `packaging_asset` and connect related content items through `packaging_asset_items`.

## Practical first build order
1. Create Supabase project
2. Build the five tables above
3. Add one simple internal admin view or table workflow
4. Load first 20-40 content items
5. Generate first English Short batch
6. Review and publish English batch
7. Mark winners and monetization candidates
8. Translate selected winners into Spanish
9. Begin first toolkit / ebook packaging from best-performing clusters

## Expansion plan

### Phase A: Pre-YouTube launch
- Supabase v1 live
- English YouTube Shorts tracked
- review flow working
- monetization tags working

### Phase B: First 30-60 days after YouTube launch
- metrics sync added
- English winners identified
- Spanish replication starts 1-3 months behind
- first packaging assets created for ebooks / toolkits

### Phase C: Mature content flywheel
- additional channels added from same content spine
- blog/article support generated from winning atoms
- newsletter and product nurture linked to same database
- Spanish system gains dedicated review cadence
- toolkit and ebook production becomes systematic instead of ad hoc

## Guardrails
- Do not build full channel parity before English winners exist
- Do not launch Spanish at full speed without translation QA discipline
- Do not separate ebook / toolkit ideation from the main content system
- Do not let YouTube publishing begin without content-state tracking

## Final recommendation
Implement Supabase before YouTube goes live.

But implement only the v1 operating system required to support:
- English Shorts launch
- delayed Spanish replication
- content flywheel tracking
- early monetization through ebooks and toolkits

This will create a cleaner launch, stronger review discipline, and a more scalable path into the broader MyAdvocate content and revenue engine.
