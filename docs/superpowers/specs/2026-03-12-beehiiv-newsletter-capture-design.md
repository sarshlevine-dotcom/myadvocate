# Beehiiv Newsletter Capture — Design Spec
**Date:** 2026-03-12
**Status:** Approved

---

## Overview

Add a reusable email capture component that subscribes visitors to the MyAdvocate Beehiiv newsletter. Email goes directly to Beehiiv — no PII stored in Supabase.

---

## Architecture

Two units: a client component (`NewsletterCapture`) and a server API route (`/api/newsletter/subscribe`).

```
User fills email → NewsletterCapture (client)
  → POST /api/newsletter/subscribe (server)
    → validate email
    → rate-limit (apiRateLimit, IP-keyed)
    → POST Beehiiv API
  ← 200 | 400 | 500
← success state | error state
```

---

## Components

### `src/components/NewsletterCapture.tsx`

- `'use client'` — needs `useState` for form state
- Uses existing `Input`, `Button`, `Alert` from `@/components`
- Four UI states:
  - **idle**: email input + "Subscribe" button
  - **submitting**: button in `loading` state, input disabled
  - **success**: `Alert` variant `success` — "You're on the list!"
  - **error**: `Alert` variant `error` — "Something went wrong. Try again."
- Client-side email validation (basic regex) before POST
- Exported from `src/components/index.ts` for re-use

### `src/app/api/newsletter/subscribe/route.ts`

- `POST` handler only
- Server-side email validation (same regex)
- Rate limit: `apiRateLimit` from `src/lib/rate-limit.ts` (30 req/min sliding window, IP-keyed via `x-forwarded-for`)
- Calls Beehiiv: `POST https://api.beehiiv.com/v2/publications/{BEEHIIV_PUBLICATION_ID}/subscriptions`
  - Auth: `Authorization: Bearer ${BEEHIIV_API_KEY}`
  - Body: `{ email, reactivate_existing: true, send_welcome_email: true }`
- Returns:
  - `200 { success: true }` on success
  - `400 { error: 'Invalid email' }` on bad input
  - `429` on rate limit
  - `500 { error: 'Subscription failed' }` on Beehiiv error

### `src/app/page.tsx`

- Import `NewsletterCapture` from `@/components`
- Add below the CTA `<div>` with `<p>` label: "Get free tips on fighting denials."

---

## Data Flow

- Email entered by user → validated client-side → sent to API route → validated server-side → forwarded to Beehiiv
- **No email written to Supabase at any point** (MA-SEC-002 compliance)
- `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID` are server-only env vars (no `NEXT_PUBLIC_` prefix)

---

## Environment Variables

Already present in `.env.example`:
```
BEEHIIV_API_KEY=your-beehiiv-api-key-here
BEEHIIV_PUBLICATION_ID=pub_xxxxxxxx
```

No changes needed to `.env.example`.

---

## Error Handling

| Scenario | Component behavior | API response |
|---|---|---|
| Invalid email (client) | Inline validation, no request sent | — |
| Invalid email (server) | Error state | 400 |
| Rate limited | Error state | 429 |
| Beehiiv API error | Error state | 500 |
| Missing env vars | Error state | 500 |

---

## Testing

- Lint: `npm run lint` — must pass with no new errors
- Tests: `npm test` — no new test file needed (no `src/lib/` changes); API route logic is thin fetch delegation
- Manual: submit valid email, confirm Beehiiv dashboard shows subscriber

---

## Security Checklist (MA-SEC-002)

- No PII stored: email forwarded to Beehiiv only ✅
- Rate limiting on public endpoint ✅
- Server-only env vars for Beehiiv credentials ✅
- No Anthropic API call involved ✅
