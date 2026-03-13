# Beehiiv Newsletter Capture Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable `NewsletterCapture` component and `/api/newsletter/subscribe` route that forwards email addresses to Beehiiv — no PII stored in Supabase.

**Architecture:** Client component handles four UI states (idle/submitting/success/error) using existing `Input`, `Button`, `Alert` primitives. A thin POST route validates email, applies the existing `apiRateLimit`, and forwards to the Beehiiv subscriptions API. Component is exported from the barrel file and placed on the homepage below the CTA.

**Tech Stack:** Next.js 14 App Router, React `useState`, Upstash Redis (`apiRateLimit`), Beehiiv REST API v2, Vitest

**Spec:** `docs/superpowers/specs/2026-03-12-beehiiv-newsletter-capture-design.md`

---

## Chunk 1: API Route

### Task 1: Subscribe API route

**Files:**
- Create: `src/app/api/newsletter/subscribe/route.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/newsletter/subscribe/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  apiRateLimit: {
    limit: vi.fn(),
  },
}))

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { POST } from './route'
import { apiRateLimit } from '@/lib/rate-limit'
import { NextRequest } from 'next/server'

// Full Upstash shape — matches pattern in per-case-checkout.test.ts
const RATE_OK = { success: true, limit: 30, remaining: 29, reset: 0, pending: Promise.resolve() } as unknown as Awaited<ReturnType<typeof apiRateLimit.limit>>
const RATE_BLOCKED = { success: false, limit: 30, remaining: 0, reset: 0, pending: Promise.resolve() } as unknown as Awaited<ReturnType<typeof apiRateLimit.limit>>

function makeRequest(body: unknown, ip = '127.0.0.1') {
  return new NextRequest('http://localhost/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/newsletter/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BEEHIIV_API_KEY = 'test-key'
    process.env.BEEHIIV_PUBLICATION_ID = 'pub_test'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.BEEHIIV_API_KEY
    delete process.env.BEEHIIV_PUBLICATION_ID
  })

  it('returns 400 on missing email', async () => {
    vi.mocked(apiRateLimit.limit).mockResolvedValue(RATE_OK)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid email')
  })

  it('returns 400 on malformed email', async () => {
    vi.mocked(apiRateLimit.limit).mockResolvedValue(RATE_OK)
    const res = await POST(makeRequest({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(apiRateLimit.limit).mockResolvedValue(RATE_BLOCKED)
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(429)
  })

  it('returns 500 when env vars are missing', async () => {
    vi.mocked(apiRateLimit.limit).mockResolvedValue(RATE_OK)
    delete process.env.BEEHIIV_API_KEY
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })

  it('returns 200 on success', async () => {
    vi.mocked(apiRateLimit.limit).mockResolvedValue(RATE_OK)
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 201 }))
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 500 when Beehiiv returns non-2xx', async () => {
    vi.mocked(apiRateLimit.limit).mockResolvedValue(RATE_OK)
    mockFetch.mockResolvedValue(new Response('error', { status: 500 }))
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/sarshlevine/myadvocate && npm test -- src/app/api/newsletter/subscribe/route.test.ts
```

Expected: FAIL — module `./route` not found.

- [ ] **Step 3: Implement the route**

Create `src/app/api/newsletter/subscribe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { apiRateLimit } from '@/lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await apiRateLimit.limit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const apiKey = process.env.BEEHIIV_API_KEY
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID
  if (!apiKey || !publicationId) {
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }

  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: true,
      }),
    }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/sarshlevine/myadvocate && npm test -- src/app/api/newsletter/subscribe/route.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Lint check**

```bash
cd /Users/sarshlevine/myadvocate && npm run lint -- --max-warnings=0 src/app/api/newsletter/subscribe/
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/sarshlevine/myadvocate && git add src/app/api/newsletter/subscribe/route.ts src/app/api/newsletter/subscribe/route.test.ts && git commit -m "feat: Beehiiv subscribe API route — validate, rate-limit, forward to Beehiiv"
```

---

## Chunk 2: Component + Integration

### Task 2: NewsletterCapture component

**Files:**
- Create: `src/components/NewsletterCapture.tsx`
- Modify: `src/components/index.ts`

- [ ] **Step 1: Create the component**

Create `src/components/NewsletterCapture.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Input } from './Input'
import { Button } from './Button'
import { Alert } from './Alert'

type State = 'idle' | 'submitting' | 'success' | 'error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function NewsletterCapture() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) return
    setState('submitting')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      setState(res.ok ? 'success' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return <Alert variant="success">You&apos;re on the list!</Alert>
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {state === 'error' && (
        <Alert variant="error">Something went wrong. Try again.</Alert>
      )}
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="your@email.com"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === 'submitting'}
          required
        />
        <Button
          type="submit"
          loading={state === 'submitting'}
          disabled={!EMAIL_RE.test(email.trim())}
        >
          Subscribe
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Export from barrel file**

Add to `src/components/index.ts` — append after the last existing export:

```typescript
export { NewsletterCapture } from './NewsletterCapture'
```

- [ ] **Step 3: Lint check**

```bash
cd /Users/sarshlevine/myadvocate && npm run lint -- --max-warnings=0 src/components/NewsletterCapture.tsx src/components/index.ts
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/sarshlevine/myadvocate && git add src/components/NewsletterCapture.tsx src/components/index.ts && git commit -m "feat: NewsletterCapture component — email capture with success/error states"
```

---

### Task 3: Place component on homepage

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add NewsletterCapture to page.tsx**

The full updated `src/app/page.tsx` (replace the entire file):

```tsx
import type { Metadata } from 'next'
import { NewsletterCapture } from '@/components'

export const metadata: Metadata = {
  title: 'MyAdvocate — Fight Your Insurance Denial',
  description:
    'Insurance denied your claim? Nearly 1 in 5 claims are denied — but fewer than 1% of patients ever appeal, even though 40–60% who do win. MyAdvocate helps you fight back.',
  alternates: { canonical: process.env.NEXT_PUBLIC_APP_URL ?? 'https://getmyadvocate.org' },
}

export default function HomePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      {/*
        Brand stat anchor — source: KFF analysis of Healthcare.gov denial/appeal data.
        YMYL NOTE: When this stat appears in published SEO content, cite as
        "KFF data through 2023" and confirm with LPN/LVN reviewer before publish.
        Homepage and product UI copy does not require the same review gate as SEO articles,
        but the stat should be updated if KFF publishes newer figures.
      */}
      <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-4">
        Fewer than 1% of patients appeal — but 40–60% of those who do, win.
      </p>
      <h1 className="text-4xl font-bold mb-4">
        The insurance company has a team. Now you do too.
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        About 1 in 5 insurance claims are denied. Most people never push back — not because
        appeals don&apos;t work, but because the system is built to make it hard. MyAdvocate
        gives you the tools, the words, and the next steps to fight back.
      </p>
      <div className="flex gap-4 flex-wrap">
        <a
          href="/tools/denial-decoder"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium text-lg"
        >
          Decode Your Denial Code →
        </a>
        <a
          href="/auth"
          className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-medium text-lg"
        >
          Write an Appeal Letter
        </a>
      </div>
      <div className="mt-12 max-w-md">
        <p className="text-sm font-medium text-gray-700 mb-3">
          Get free tips on fighting denials.
        </p>
        <NewsletterCapture />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Lint check**

```bash
cd /Users/sarshlevine/myadvocate && npm run lint -- --max-warnings=0 src/app/page.tsx
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/sarshlevine/myadvocate && npm test
```

Expected: all tests pass (no regressions).

- [ ] **Step 4: Final commit**

```bash
cd /Users/sarshlevine/myadvocate && git add src/app/page.tsx && git commit -m "feat: Beehiiv newsletter capture — component + subscribe API route"
```

> Note: The final commit message matches the task requirement exactly.

---

## Verification checklist

- [ ] `npm run lint` passes with no new errors
- [ ] `npm test` passes — 6 new tests in `route.test.ts`, no regressions
- [ ] `NewsletterCapture` exported from `src/components/index.ts`
- [ ] No email written to Supabase anywhere in the new code
- [ ] `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID` are server-only (no `NEXT_PUBLIC_` prefix)
