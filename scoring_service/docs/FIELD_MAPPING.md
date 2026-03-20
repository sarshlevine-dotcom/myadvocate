# Field mapping

## Search Console -> CMO
- clicks, impressions, ctr, avg_position -> page_metrics_daily
- last_refreshed_at from pages
- derived: position_delta_7d, ctr_delta_7d, refresh_due

## GA4 -> UX/CFO
- page_view, tool_start, tool_complete, email_capture, paid_offer_accept
- derived: tool_completion_rate, email_capture_rate, paid_conversion_rate, dropoff_step

## Stripe -> CFO
- checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.*
- writes to billing_events
- derived: MRR, failed payment rate, conversion by source page

## Logs -> CTO
- feature route, provider, calls, cost, latency, failure, cache hit/miss
- derived: cost_spike_score, reliability_score, dependency_score
