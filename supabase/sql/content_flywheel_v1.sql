-- MyAdvocate Content Flywheel Supabase v1
-- Purpose: structured content spine for English launch, delayed Spanish replication,
-- and early monetization via ebooks + toolkits.

create extension if not exists pgcrypto;

-- Enums
create type public.content_item_status as enum (
  'idea',
  'queued',
  'drafted',
  'in_review',
  'approved',
  'active',
  'archived'
);

create type public.content_variant_status as enum (
  'draft',
  'in_review',
  'approved',
  'produced',
  'scheduled',
  'published',
  'failed',
  'archived'
);

create type public.translation_status as enum (
  'not_eligible',
  'candidate',
  'approved_for_translation',
  'translated',
  'published_es'
);

create type public.packaging_asset_type as enum (
  'ebook',
  'toolkit',
  'bundle',
  'newsletter_series'
);

create type public.packaging_asset_status as enum (
  'idea',
  'outline',
  'drafting',
  'review',
  'ready',
  'published',
  'archived'
);

create type public.channel_type as enum (
  'youtube',
  'instagram',
  'tiktok',
  'newsletter',
  'blog',
  'product',
  'ebook',
  'toolkit'
);

create type public.format_type as enum (
  'short',
  'longform',
  'article',
  'email',
  'chapter',
  'module',
  'checklist',
  'template'
);

-- Updated-at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Core content atoms
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_working text not null,
  summary text,
  pillar text not null,
  content_type text not null,
  source_asset_type text not null,
  source_asset_id text,
  target_query text,
  language_origin text not null default 'en',
  ymyl_tier smallint not null default 1 check (ymyl_tier in (1,2,3)),
  review_level text not null default 'founder',
  requires_founder_review boolean not null default true,
  requires_kate_review boolean not null default false,
  requires_attorney_review boolean not null default false,
  monetization_role text not null default 'educational_only',
  monetization_candidate boolean not null default false,
  ebook_candidate boolean not null default false,
  toolkit_candidate boolean not null default false,
  newsletter_candidate boolean not null default true,
  translation_status public.translation_status not null default 'not_eligible',
  status public.content_item_status not null default 'idea',
  priority_score numeric(5,2) not null default 0,
  evergreen_score numeric(5,2) not null default 0,
  cta_target text,
  canonical_url_target text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_content_items_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

create index if not exists idx_content_items_status on public.content_items(status);
create index if not exists idx_content_items_pillar on public.content_items(pillar);
create index if not exists idx_content_items_translation_status on public.content_items(translation_status);
create index if not exists idx_content_items_monetization_flags on public.content_items(ebook_candidate, toolkit_candidate, monetization_candidate);

-- 2) Distribution / product variants
create table if not exists public.content_variants (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  channel public.channel_type not null,
  format public.format_type not null,
  language text not null default 'en',
  variant_role text not null default 'distribution',
  title text,
  hook text,
  script_text text,
  description_text text,
  cta_text text,
  thumbnail_text text,
  status public.content_variant_status not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  external_url text,
  translation_parent_variant_id uuid references public.content_variants(id) on delete set null,
  production_notes text,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_content_variants_updated_at
before update on public.content_variants
for each row execute function public.set_updated_at();

create index if not exists idx_content_variants_content_item on public.content_variants(content_item_id);
create index if not exists idx_content_variants_status on public.content_variants(status);
create index if not exists idx_content_variants_channel_lang on public.content_variants(channel, language);

-- 3) Metrics snapshots
create table if not exists public.content_metrics (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.content_variants(id) on delete cascade,
  window_type text not null check (window_type in ('24h','7d','28d','lifetime')),
  views integer not null default 0,
  clicks integer not null default 0,
  signups integer not null default 0,
  paid_conversions integer not null default 0,
  save_rate numeric(6,3) not null default 0,
  retention_rate numeric(6,3) not null default 0,
  comments integer not null default 0,
  shares integer not null default 0,
  quality_score numeric(6,2) not null default 0,
  synced_at timestamptz not null default now(),
  unique (variant_id, window_type, synced_at)
);

create index if not exists idx_content_metrics_variant on public.content_metrics(variant_id);
create index if not exists idx_content_metrics_quality on public.content_metrics(quality_score desc);

-- 4) Monetization packaging assets
create table if not exists public.packaging_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type public.packaging_asset_type not null,
  title_working text not null,
  status public.packaging_asset_status not null default 'idea',
  target_audience text,
  monetization_stage text not null default 'early_revenue',
  packaging_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_packaging_assets_updated_at
before update on public.packaging_assets
for each row execute function public.set_updated_at();

create index if not exists idx_packaging_assets_type_status on public.packaging_assets(asset_type, status);

-- 5) Packaging joins
create table if not exists public.packaging_asset_items (
  id uuid primary key default gen_random_uuid(),
  packaging_asset_id uuid not null references public.packaging_assets(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  role_in_asset text not null,
  sequence_order integer not null default 0,
  notes text,
  unique (packaging_asset_id, content_item_id)
);

create index if not exists idx_packaging_asset_items_asset on public.packaging_asset_items(packaging_asset_id, sequence_order);
create index if not exists idx_packaging_asset_items_content_item on public.packaging_asset_items(content_item_id);

-- Helpful views
create or replace view public.content_item_rollup as
select
  ci.id,
  ci.slug,
  ci.title_working,
  ci.pillar,
  ci.content_type,
  ci.status,
  ci.translation_status,
  ci.ebook_candidate,
  ci.toolkit_candidate,
  count(cv.id) as variant_count,
  count(*) filter (where cv.language = 'es') as spanish_variant_count,
  max(cv.published_at) as last_published_at
from public.content_items ci
left join public.content_variants cv on cv.content_item_id = ci.id
group by ci.id;

create or replace view public.spanish_candidate_queue as
select
  ci.id as content_item_id,
  ci.slug,
  ci.title_working,
  cv.id as english_variant_id,
  cv.title,
  cm.views,
  cm.clicks,
  cm.signups,
  cm.quality_score,
  ci.translation_status
from public.content_items ci
join public.content_variants cv
  on cv.content_item_id = ci.id
  and cv.language = 'en'
  and cv.channel = 'youtube'
  and cv.format = 'short'
join lateral (
  select m.*
  from public.content_metrics m
  where m.variant_id = cv.id and m.window_type = '7d'
  order by m.synced_at desc
  limit 1
) cm on true
where ci.translation_status in ('candidate','approved_for_translation')
order by cm.quality_score desc, cm.signups desc, cm.views desc;

-- Lightweight RLS starter policy note:
-- Enable RLS after auth model is finalized. For founder-only internal use,
-- start with service-role access in server actions / n8n and add explicit policies later.
