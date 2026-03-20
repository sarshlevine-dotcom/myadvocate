-- 001_content_flywheel_and_tasks.sql
create extension if not exists pgcrypto;

do $$ begin
  create type public.content_item_status as enum ('idea','queued','drafted','in_review','approved','active','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_variant_status as enum ('draft','in_review','approved','produced','scheduled','published','failed','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.translation_status as enum ('not_eligible','candidate','approved_for_translation','translated','published_es');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.packaging_asset_type as enum ('ebook','toolkit','bundle','newsletter_series');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.packaging_asset_status as enum ('idea','outline','drafting','review','ready','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.channel_type as enum ('youtube','instagram','tiktok','newsletter','blog','product','ebook','toolkit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.format_type as enum ('short','longform','article','email','chapter','module','checklist','template');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('queued','approved_to_run','running','pr_open','awaiting_review','approved','rejected','merged','blocked');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
  synced_at timestamptz not null default now()
);

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

create table if not exists public.packaging_asset_items (
  id uuid primary key default gen_random_uuid(),
  packaging_asset_id uuid not null references public.packaging_assets(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  role_in_asset text not null,
  sequence_order integer not null default 0,
  notes text,
  unique (packaging_asset_id, content_item_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  context text,
  repo_scope text,
  constraints text,
  acceptance_criteria text,
  risk_class text not null default 'medium',
  trigger_source text not null default 'manual',
  launch_blocker boolean not null default false,
  required_reviewer text not null default 'founder',
  status public.task_status not null default 'queued',
  issue_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  run_status text not null default 'queued',
  openhands_session text,
  branch_name text,
  pr_url text,
  result_summary text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.denial_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  plain_language_meaning text,
  recommended_next_step text,
  seo_slug text not null unique,
  risk_notes text,
  review_status text not null default 'draft',
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  version integer not null default 1,
  language text not null default 'en',
  template_text text,
  template_json jsonb,
  use_case text not null,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, version, language)
);

drop trigger if exists set_content_items_updated_at on public.content_items;
create trigger set_content_items_updated_at before update on public.content_items
for each row execute function public.set_updated_at();

drop trigger if exists set_content_variants_updated_at on public.content_variants;
create trigger set_content_variants_updated_at before update on public.content_variants
for each row execute function public.set_updated_at();

drop trigger if exists set_packaging_assets_updated_at on public.packaging_assets;
create trigger set_packaging_assets_updated_at before update on public.packaging_assets
for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_denial_codes_updated_at on public.denial_codes;
create trigger set_denial_codes_updated_at before update on public.denial_codes
for each row execute function public.set_updated_at();

drop trigger if exists set_prompt_templates_updated_at on public.prompt_templates;
create trigger set_prompt_templates_updated_at before update on public.prompt_templates
for each row execute function public.set_updated_at();

create index if not exists idx_content_items_status on public.content_items(status);
create index if not exists idx_content_items_translation on public.content_items(translation_status);
create index if not exists idx_content_variants_item on public.content_variants(content_item_id);
create index if not exists idx_content_variants_status on public.content_variants(status);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_task_runs_task_id on public.task_runs(task_id);

create or replace view public.content_item_rollup as
select
  ci.id,
  ci.slug,
  ci.title_working,
  ci.pillar,
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