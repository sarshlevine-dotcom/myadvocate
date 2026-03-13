# MyAdvocate — Minimum Incident Response Runbook

**Version:** 1.0 · Created: 2026-03-13
**Owner:** Sarsh Levine (founder)
**Review trigger:** After any P1 event; annually thereafter

---

## Severity Definitions

| Severity | Definition | Response Target |
|---|---|---|
| **P1** | PII or health data exposed in production; letters reaching users without review; Supabase or Anthropic breach; system generating outputs that bypass all safety gates | **Same day** |
| **P2** | Generation pipeline fully down; review queue inaccessible; Stripe webhook failing; rate limiter not firing; Kate unable to access review interface | **4 hours** |
| **P3** | Non-critical bug; performance degradation; cosmetic or UX issues; single-user errors not indicative of systemic failure | **48 hours** |

---

## P1 Response Steps

1. **Disable the affected endpoint immediately** — Vercel environment variable or feature flag off; do not wait to diagnose first
2. **Preserve logs** — Screenshot or export Vercel runtime logs, Supabase audit logs, and Langfuse traces for the affected window before they rotate
3. **Notify Anthropic** — support.anthropic.com — describe scope of data that may have passed through the API
4. **Notify Supabase** — support.supabase.com — describe any potential data exposure in the database
5. **Identify affected users** — Query `artifacts` and `metric_events` for the affected time window; get user IDs and emails
6. **Notify affected users within 72 hours** — Use the template below
7. **Post-incident review** — Document root cause and remediation in `docs/security/`

## P1 User Notification Template

```
Subject: Important notice about your MyAdvocate account

We are writing to let you know that we identified a technical issue on [DATE]
that may have affected [brief description — e.g., "the security of documents
you uploaded" or "the review process for your generated letter"].

What happened: [1–2 sentences, plain language, no technical jargon]

What we did: We immediately [disabled the affected feature / secured the system].

What this means for you: [Specific impact — e.g., "Your document has been
deleted from our systems and you will need to re-upload it" or "No action
is required on your part."]

We take the security of your health information seriously. If you have questions,
reply to this email or contact us at admin@getmyadvocate.org.

The MyAdvocate Team
```

---

## P2 Response Steps

1. Identify which component is down (Vercel deployment, Supabase, Stripe, Anthropic API)
2. Check status pages: vercel.com/status · status.supabase.com · stripe.com/status · status.anthropic.com
3. If internal: redeploy last known good commit via Vercel dashboard
4. Notify users in the review queue if their 24-hour SLA will be exceeded
5. Log incident in `docs/security/` with timeline and resolution

---

## P3 Response Steps

1. Log issue in Notion sprint board with reproduction steps
2. Assign priority and sprint
3. No user notification unless the issue affects data integrity

---

## Key Contacts

| Service | Support Link | Notes |
|---|---|---|
| Anthropic | support.anthropic.com | Include API key last 4 digits; do NOT include full key |
| Supabase | support.supabase.com | Include project ref ID |
| Stripe | support.stripe.com | Include account ID |
| Vercel | vercel.com/help | Include deployment URL |

---

## Review History

| Date | Reviewer | Changes |
|---|---|---|
| 2026-03-13 | Sarsh Levine | Initial version created |

