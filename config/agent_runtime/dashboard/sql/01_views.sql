-- Starter views for the MyAdvocate dashboard runtime.
-- Replace table names with your production schema names.

create or replace view vw_director_health as
select
  boss_agent_id as director_agent_id,
  count(*) as direct_report_count,
  sum(case when status = 'blocked' then 1 else 0 end) as blocked_count,
  max(updated_at) as latest_update_at
from agent_status_snapshots
group by boss_agent_id;

create or replace view vw_reporting_freshness as
select
  recipient_agent_id,
  report_type,
  max(created_at) as latest_report_at
from agent_reports
group by recipient_agent_id, report_type;

create or replace view vw_launch_blockers_open as
select *
from launch_blockers
where status not in ('cleared', 'closed');

create or replace view vw_founder_decisions_needed as
select *
from decision_requests
where decision_status = 'pending'
order by severity desc, created_at asc;

create or replace view vw_compliance_exceptions_open as
select *
from compliance_exceptions
where status in ('open', 'investigating', 'mitigating');
