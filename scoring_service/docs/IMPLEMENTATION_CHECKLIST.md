# Implementation checklist

1. Apply `supabase/schema.sql`
2. Apply `supabase/views.sql`
3. Run scoring service locally or on a small internal service host
4. Import `n8n/stripe_webhook_to_supabase.json`
5. Point Stripe webhook to the n8n endpoint
6. Import `n8n/cmo_real_data_refresh_queue.json`
7. Add Search Console credentials and site URL
8. Import `n8n/cfo_cohort_scoring.json`
9. Configure Slack credentials and channels
10. Keep week 1 in approval-first mode
11. Only enable AUTO for low-risk internal actions after logging outcomes
