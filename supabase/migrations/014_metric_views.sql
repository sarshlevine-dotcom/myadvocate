-- PMP v19 §8: SQL views for the 7 business telemetry metrics
-- All views return empty sets gracefully when metric_events has no data.

-- 1. Free Letter Completion Rate (target 60–80%)
--    Numerator:   letter_generated events
--    Denominator: tool_use events (represent tool starts)
--    Grouped by day
CREATE OR REPLACE VIEW metric_letter_completion_rate AS
SELECT
  DATE_TRUNC('day', occurred_at)::DATE AS day,
  COUNT(*) FILTER (WHERE event_type = 'letter_generated') AS letters_generated,
  COUNT(*) FILTER (WHERE event_type = 'tool_use')         AS tool_starts,
  CASE
    WHEN COUNT(*) FILTER (WHERE event_type = 'tool_use') = 0 THEN NULL
    ELSE ROUND(
      COUNT(*) FILTER (WHERE event_type = 'letter_generated')::NUMERIC
      / COUNT(*) FILTER (WHERE event_type = 'tool_use') * 100,
      2
    )
  END AS completion_rate_pct
FROM public.metric_events
WHERE event_type IN ('letter_generated', 'tool_use')
GROUP BY 1
ORDER BY 1 DESC;

-- 2. Free-to-Second-Need Rate (target 10–25%)
--    Numerator:   second_tool_use events
--    Denominator: letter_generated events
--    Grouped by day
CREATE OR REPLACE VIEW metric_second_need_rate AS
SELECT
  DATE_TRUNC('day', occurred_at)::DATE AS day,
  COUNT(*) FILTER (WHERE event_type = 'second_tool_use') AS second_tool_uses,
  COUNT(*) FILTER (WHERE event_type = 'letter_generated') AS letters_generated,
  CASE
    WHEN COUNT(*) FILTER (WHERE event_type = 'letter_generated') = 0 THEN NULL
    ELSE ROUND(
      COUNT(*) FILTER (WHERE event_type = 'second_tool_use')::NUMERIC
      / COUNT(*) FILTER (WHERE event_type = 'letter_generated') * 100,
      2
    )
  END AS second_need_rate_pct
FROM public.metric_events
WHERE event_type IN ('second_tool_use', 'letter_generated')
GROUP BY 1
ORDER BY 1 DESC;

-- 3. Per-Case Take Rate (target 20–40%)
--    Numerator:   per_case_purchased events
--    Denominator: per_case_checkout events
--    Grouped by day
CREATE OR REPLACE VIEW metric_per_case_take_rate AS
SELECT
  DATE_TRUNC('day', occurred_at)::DATE AS day,
  COUNT(*) FILTER (WHERE event_type = 'per_case_purchased') AS purchases,
  COUNT(*) FILTER (WHERE event_type = 'per_case_checkout')  AS checkouts,
  CASE
    WHEN COUNT(*) FILTER (WHERE event_type = 'per_case_checkout') = 0 THEN NULL
    ELSE ROUND(
      COUNT(*) FILTER (WHERE event_type = 'per_case_purchased')::NUMERIC
      / COUNT(*) FILTER (WHERE event_type = 'per_case_checkout') * 100,
      2
    )
  END AS take_rate_pct
FROM public.metric_events
WHERE event_type IN ('per_case_purchased', 'per_case_checkout')
GROUP BY 1
ORDER BY 1 DESC;

-- 4. Per-Case to Subscription Rate (target 15–25%)
--    Numerator:   users who purchased per-case AND started a subscription within 30 days
--    Denominator: distinct users with per_case_purchased
--    Grouped by calendar month of the purchase
CREATE OR REPLACE VIEW metric_per_case_to_sub_rate AS
SELECT
  DATE_TRUNC('month', p.occurred_at)::DATE AS month,
  COUNT(DISTINCT p.user_id) AS per_case_users,
  COUNT(DISTINCT p.user_id) FILTER (
    WHERE EXISTS (
      SELECT 1
      FROM public.metric_events s
      WHERE s.event_type = 'subscription_started'
        AND s.user_id = p.user_id
        AND s.occurred_at BETWEEN p.occurred_at AND p.occurred_at + INTERVAL '30 days'
    )
  ) AS converted_to_sub,
  CASE
    WHEN COUNT(DISTINCT p.user_id) = 0 THEN NULL
    ELSE ROUND(
      COUNT(DISTINCT p.user_id) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM public.metric_events s
          WHERE s.event_type = 'subscription_started'
            AND s.user_id = p.user_id
            AND s.occurred_at BETWEEN p.occurred_at AND p.occurred_at + INTERVAL '30 days'
        )
      )::NUMERIC / COUNT(DISTINCT p.user_id) * 100,
      2
    )
  END AS conversion_rate_pct
FROM public.metric_events p
WHERE p.event_type = 'per_case_purchased'
  AND p.user_id IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;

-- 5. Per-Case Repeat Rate (target <15%)
--    Users who purchased per-case 2+ times / total per-case buyers
--    Grouped by calendar month
CREATE OR REPLACE VIEW metric_repeat_rate AS
SELECT
  DATE_TRUNC('month', occurred_at)::DATE AS month,
  COUNT(DISTINCT user_id)                                                    AS total_per_case_users,
  COUNT(DISTINCT user_id) FILTER (WHERE purchase_count >= 2)                AS repeat_buyers,
  CASE
    WHEN COUNT(DISTINCT user_id) = 0 THEN NULL
    ELSE ROUND(
      COUNT(DISTINCT user_id) FILTER (WHERE purchase_count >= 2)::NUMERIC
      / COUNT(DISTINCT user_id) * 100,
      2
    )
  END AS repeat_rate_pct
FROM (
  SELECT
    user_id,
    DATE_TRUNC('month', occurred_at) AS occurred_at,
    COUNT(*) AS purchase_count
  FROM public.metric_events
  WHERE event_type = 'per_case_purchased'
    AND user_id IS NOT NULL
  GROUP BY user_id, DATE_TRUNC('month', occurred_at)
) AS per_user_monthly
GROUP BY 1
ORDER BY 1 DESC;

-- 6. Blended ARPU (target $5–12/mo)
--    Total revenue (amount_cents) / distinct active users, by month
CREATE OR REPLACE VIEW metric_blended_arpu AS
SELECT
  DATE_TRUNC('month', occurred_at)::DATE AS month,
  SUM(amount_cents)                      AS total_revenue_cents,
  COUNT(DISTINCT user_id)                AS active_users,
  CASE
    WHEN COUNT(DISTINCT user_id) = 0 THEN NULL
    ELSE ROUND(
      SUM(amount_cents)::NUMERIC / COUNT(DISTINCT user_id) / 100,
      2
    )
  END AS arpu_dollars
FROM public.metric_events
WHERE event_type IN ('per_case_purchased', 'subscription_started')
  AND amount_cents IS NOT NULL
  AND user_id IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;

-- 7. Revenue Mix — subscriptions ≥75% of total revenue (by month)
CREATE OR REPLACE VIEW metric_revenue_mix AS
SELECT
  DATE_TRUNC('month', occurred_at)::DATE AS month,
  SUM(amount_cents)                                                              AS total_revenue_cents,
  SUM(amount_cents) FILTER (WHERE event_type = 'subscription_started')          AS subscription_revenue_cents,
  SUM(amount_cents) FILTER (WHERE event_type = 'per_case_purchased')            AS per_case_revenue_cents,
  CASE
    WHEN SUM(amount_cents) = 0 OR SUM(amount_cents) IS NULL THEN NULL
    ELSE ROUND(
      SUM(amount_cents) FILTER (WHERE event_type = 'subscription_started')::NUMERIC
      / SUM(amount_cents) * 100,
      2
    )
  END AS subscription_pct
FROM public.metric_events
WHERE event_type IN ('per_case_purchased', 'subscription_started')
  AND amount_cents IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;
