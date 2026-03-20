insert into public.tasks (
  title, description, context, repo_scope, constraints, acceptance_criteria,
  risk_class, trigger_source, launch_blocker, required_reviewer, status
)
values
(
  'Build founder-only admin route',
  'Create a protected /admin route with placeholder panels.',
  'Internal owner command center for launch blockers, content, monetization, and OpenHands.',
  'app/admin/*, components/admin/*',
  'Founder-only. Functional over polished.',
  'Route loads, protected, five panels visible.',
  'medium', 'manual', true, 'founder', 'queued'
),
(
  'Add tasks and task_runs schema',
  'Create the DB schema for internal execution tracking.',
  'OpenHands needs structured queue tracking.',
  'supabase/migrations/*',
  'Include indexes and starter statuses.',
  'Migration runs and tables are queryable.',
  'low', 'manual', true, 'founder', 'queued'
),
(
  'Build content queue panel',
  'Render content rollup and translation state in admin.',
  'Content system visibility is required before YouTube goes live.',
  'components/admin/*, lib/admin/*',
  'Show status, pillar, ES state, monetization flags.',
  'Live Supabase rows visible in admin.',
  'low', 'manual', false, 'founder', 'queued'
),
(
  'Add denial_codes table and import scaffold',
  'Create denial_codes and a starter import script scaffold.',
  'Denial Decoder supports SEO and toolkit monetization.',
  'supabase/*, scripts/*',
  'Safe to rerun. Validation-friendly.',
  'Table exists and scaffold is documented or runnable.',
  'medium', 'manual', true, 'founder', 'queued'
),
(
  'Add prompt_templates registry',
  'Create DB-backed prompt registry and minimal admin stub.',
  'Prompts should not remain hardcoded.',
  'supabase/*, components/admin/*',
  'Minimal CRUD only for v1.',
  'Founder can add and read prompt templates.',
  'medium', 'manual', false, 'founder', 'queued'
);