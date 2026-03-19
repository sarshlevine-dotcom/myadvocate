-- MA-IMPL-003 S0-01 / Real Data Pipeline Schema
-- Part of the V4 Scoring Service & Autonomous Agent Architecture
-- Canonical doc: docs/intelligence/MA-IMPL-003_BitNet_V4_Month0-12_Rollout.docx
-- Source: MyAdvocate_Real_Data_Wiring_Build_Pack (schema.sql + views.sql)
--
-- INVARIANTS:
--   - This schema is internal-only. No user PII flows through these tables.
--   - decision_log is write-once; no UPDATE permitted from application code.
--   - billing_events deduplicates on stripe_event_id.
--
-- Rollout order: Week 1 Stripe → Week 2 GSC → Week 3 GA4 → Week 4 App logs
-- All actions remain at APPROVAL/LOG until Month 2 autonomous validation gate.

-- ────────────────────────────────────────────────
-- 1. SEO / CMO layer
-- ────────────────────────────────────────────────

create table if not exists pages (
  page_id           uuid primary key default gen_random_uuid(),
  url               text unique not null,
  cluster           text not null,
  page_type         text not null,
  state             text,
  tool_attached     boolean default false,
  toolkit_attached  boolean default false,
  status            text default 'active',
  last_published_at timestamptz,
  last_refreshed_at timestamptz,
  created_at        timestamptz default now()
);

create table if not exists page_metrics_daily (
  id              bigserial primary key,
  page_id         uuid references pages(page_id) on delete cascade,
  metric_date     date not null,
  clicks          integer default 0,
  impressions     integer default 0,
  ctr             numeric(8,5) default 0,
  avg_position    numeric(8,3),
  indexed_seen_at timestamptz,
  device          text,
  query           text
);

-- ────────────────────────────────────────────────
-- 2. Funnel / UX + CFO layer
-- ────────────────────────────────────────────────

create table if not exists tool_sessions (
  session_id              uuid primary key default gen_random_uuid(),
  entry_page              text,
  cluster                 text,
  tool_name               text,
  session_started_at      timestamptz default now(),
  tool_started            boolean default false,
  tool_completed          boolean default false,
  email_captured          boolean default false,
  paid_conversion         boolean default false,
  toolkit_click           boolean default false,
  referral_click          boolean default false,
  dropoff_step            text,
  time_to_complete_seconds integer,
  source_medium           text
);

-- ────────────────────────────────────────────────
-- 3. Revenue / CFO layer (Stripe webhooks)
-- ────────────────────────────────────────────────

create table if not exists billing_events (
  id              bigserial primary key,
  stripe_event_id text unique not null,
  event_type      text not null,
  customer_id     text,
  subscription_id text,
  amount_cents    integer,
  currency        text,
  status          text,
  source_page     text,
  cohort          text,
  created_at      timestamptz default now()
);

-- ────────────────────────────────────────────────
-- 4. Agent decision audit log (write-once)
-- ────────────────────────────────────────────────

create table if not exists decision_log (
  decision_id   uuid primary key default gen_random_uuid(),
  agent         text not null,
  decision_type text not null,
  action        text not null,
  decision_score numeric(8,4),
  confidence    numeric(8,4),
  impact        numeric(8,4),
  risk          numeric(8,4),
  urgency       numeric(8,4),
  learning      numeric(8,4),
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now()
);

-- ────────────────────────────────────────────────
-- 5. Content queue (CMO action output)
-- ────────────────────────────────────────────────

create table if not exists content_queue (
  id          bigserial primary key,
  queue_type  text not null, -- refresh / expand / link / toolkit_link
  page_id     uuid references pages(page_id) on delete set null,
  target_url  text,
  cluster     text,
  reason      text,
  score       numeric(8,4),
  status      text default 'pending',
  created_at  timestamptz default now()
);

-- ────────────────────────────────────────────────
-- 6. Experiments (A/B scaffolding — Month 5+)
-- ────────────────────────────────────────────────

create table if not exists experiments (
  experiment_id  uuid primary key default gen_random_uuid(),
  name           text not null,
  decision_type  text not null,
  cohort         text,
  status         text default 'draft',
  started_at     timestamptz,
  ended_at       timestamptz,
  result_summary text,
  metadata       jsonb default '{}'::jsonb
);

-- ────────────────────────────────────────────────
-- 7. Feedback outcomes (learning loop)
-- ────────────────────────────────────────────────

create table if not exists feedback_outcomes (
  id            bigserial primary key,
  decision_type text not null,
  agent         text not null,
  outcome       text not null, -- success / failure / neutral
  actual_lift   numeric(8,4),
  notes         text,
  created_at    timestamptz default now()
);

-- ────────────────────────────────────────────────
-- 8. Views for agent queries
-- ────────────────────────────────────────────────

create or replace view v_page_refresh_candidates as
select
  p.page_id,
  p.url,
  p.cluster,
  p.last_refreshed_at,
  max(m.metric_date) as last_metric_date,
  sum(m.impressions) filter (where m.metric_date >= current_date - interval '7 days') as impressions_7d,
  sum(m.clicks)      filter (where m.metric_date >= current_date - interval '7 days') as clicks_7d,
  avg(m.avg_position) filter (where m.metric_date >= current_date - interval '7 days') as avg_position_7d
from pages p
left join page_metrics_daily m on m.page_id = p.page_id
group by 1,2,3,4;

create or replace view v_funnel_rollup as
select
  entry_page,
  cluster,
  count(*)                                                                       as sessions,
  avg(case when tool_started    then 1 else 0 end)::numeric(8,4)                as tool_start_rate,
  avg(case when tool_completed  then 1 else 0 end)::numeric(8,4)                as tool_completion_rate,
  avg(case when email_captured  then 1 else 0 end)::numeric(8,4)                as email_capture_rate,
  avg(case when paid_conversion then 1 else 0 end)::numeric(8,4)                as paid_conversion_rate
from tool_sessions
group by 1,2;
