# YMYL Review Notification System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the YMYL review notification system (MA-SEC-002 P27) — email Kate and Sarsh on every new artifact, enforce a 10-artifact queue depth cap with Sarsh-only capacity alert, and wire the queue depth guard into the generate API route.

**Architecture:** A `mailer.ts` lib module owns all SMTP logic (nodemailer). An internal API route `POST /api/internal/notify-review` queries the artifact and dispatches email. The generate API route checks queue depth before calling `generateLetter()` and fires a fire-and-forget notification after the artifact is created.

**Tech Stack:** nodemailer (+ @types/nodemailer), Vitest, Next.js App Router, Supabase service role, Google Workspace SMTP (port 587/STARTTLS).

---

## Chunk 1: Mailer Library

### Task 1: Install nodemailer

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install nodemailer**

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

Expected: `package.json` dependencies updated, no errors.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add nodemailer dependency for YMYL review notifications"
```

---

### Task 2: Write failing tests for mailer.ts

**Files:**
- Create: `src/__tests__/mailer.test.ts`
- Create: `src/lib/mailer.ts` (stub)

- [ ] **Step 1: Create the test file**

```typescript
// src/__tests__/mailer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock nodemailer before importing mailer
const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
const mockCreateTransport = vi.fn().mockReturnValue({ sendMail: mockSendMail })

vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
}))

// Set required env vars
vi.stubEnv('SMTP_HOST', 'smtp.gmail.com')
vi.stubEnv('SMTP_PORT', '587')
vi.stubEnv('SMTP_USER', 'admin@getmyadvocate.org')
vi.stubEnv('SMTP_PASS', 'test-pass')
vi.stubEnv('KATE_EMAIL', 'kate@example.com')
vi.stubEnv('SARSH_EMAIL', 'sarsh@example.com')

import { sendReviewNotification, sendCapacityAlert } from '@/lib/mailer'

const MOCK_ARTIFACT = {
  id: 'art-123',
  artifact_type: 'denial_appeal',
  user_id: 'user-abc',
  created_at: '2026-03-13T12:00:00Z',
  release_state: 'review_required',
}

describe('sendReviewNotification', () => {
  beforeEach(() => mockSendMail.mockClear())

  it('sends email to both Kate and Sarsh', async () => {
    await sendReviewNotification(MOCK_ARTIFACT)
    expect(mockSendMail).toHaveBeenCalledTimes(1)
    const call = mockSendMail.mock.calls[0][0]
    expect(call.to).toContain('kate@example.com')
    expect(call.to).toContain('sarsh@example.com')
  })

  it('includes the letter type in the subject', async () => {
    await sendReviewNotification(MOCK_ARTIFACT)
    const call = mockSendMail.mock.calls[0][0]
    expect(call.subject).toContain('denial_appeal')
    expect(call.subject).toContain('[MyAdvocate]')
  })

  it('includes artifact id and user id in body (no PII)', async () => {
    await sendReviewNotification(MOCK_ARTIFACT)
    const call = mockSendMail.mock.calls[0][0]
    const body = call.text ?? call.html ?? ''
    expect(body).toContain('art-123')
    expect(body).toContain('user-abc')
  })

  it('does not throw on sendMail failure — resolves false', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP down'))
    await expect(sendReviewNotification(MOCK_ARTIFACT)).resolves.toBe(false)
  })
})

describe('sendCapacityAlert', () => {
  beforeEach(() => mockSendMail.mockClear())

  it('sends email only to Sarsh (not Kate)', async () => {
    await sendCapacityAlert()
    const call = mockSendMail.mock.calls[0][0]
    expect(call.to).not.toContain('kate@example.com')
    expect(call.to).toContain('sarsh@example.com')
  })

  it('includes ALERT and capacity in subject', async () => {
    await sendCapacityAlert()
    const call = mockSendMail.mock.calls[0][0]
    expect(call.subject).toContain('ALERT')
    expect(call.subject).toContain('capacity')
  })

  it('does not throw on sendMail failure — resolves false', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP down'))
    await expect(sendCapacityAlert()).resolves.toBe(false)
  })
})
```

- [ ] **Step 2: Create stub mailer.ts so tests can import**

```typescript
// src/lib/mailer.ts
export async function sendReviewNotification(_artifact: unknown): Promise<boolean> {
  throw new Error('not implemented')
}
export async function sendCapacityAlert(): Promise<boolean> {
  throw new Error('not implemented')
}
```

- [ ] **Step 3: Run tests and verify they fail**

```bash
npm test -- mailer
```

Expected: all tests fail with "not implemented" or import errors.

---

### Task 3: Implement mailer.ts

**Files:**
- Modify: `src/lib/mailer.ts`

- [ ] **Step 1: Write the implementation**

```typescript
// src/lib/mailer.ts
// MA-SEC-002 P27: YMYL review notification mailer.
// All email logic lives here. Never call nodemailer directly from routes.

import nodemailer from 'nodemailer'

// Artifact shape needed by this module — subset of the DB row
export interface ArtifactNotificationPayload {
  id: string
  artifact_type: string
  user_id: string
  created_at: string
  release_state: string
}

function getTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: false,      // STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const FROM = '"MyAdvocate" <admin@getmyadvocate.org>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getmyadvocate.org'

/**
 * Notify Kate + Sarsh of a new artifact pending YMYL review.
 * Returns true on success, false on failure — never throws.
 */
export async function sendReviewNotification(
  artifact: ArtifactNotificationPayload
): Promise<boolean> {
  try {
    const to = [process.env.KATE_EMAIL, process.env.SARSH_EMAIL]
      .filter(Boolean)
      .join(', ')

    const reviewUrl = `${APP_URL}/admin/review`

    const text = [
      'A new artifact is pending YMYL clinical review.',
      '',
      `Artifact ID:   ${artifact.id}`,
      `Letter type:   ${artifact.artifact_type}`,
      `User ID:       ${artifact.user_id}`,
      `Created at:    ${artifact.created_at}`,
      `Release state: ${artifact.release_state}`,
      '',
      `Review queue:  ${reviewUrl}`,
      '',
      'SLA: 24 hours from generation time.',
    ].join('\n')

    await getTransport().sendMail({
      from:    FROM,
      to,
      subject: `[MyAdvocate] New artifact pending review — ${artifact.artifact_type}`,
      text,
    })
    return true
  } catch (err) {
    console.error('[mailer] sendReviewNotification failed:', err)
    return false
  }
}

/**
 * Alert Sarsh (only) that the review queue has hit the 10-artifact cap.
 * Returns true on success, false on failure — never throws.
 */
export async function sendCapacityAlert(): Promise<boolean> {
  try {
    const reviewUrl = `${APP_URL}/admin/review`

    const text = [
      'ALERT: The YMYL review queue has reached capacity (10 pending artifacts).',
      '',
      'New artifact generation is paused until the queue drops below 10.',
      '',
      `Review queue: ${reviewUrl}`,
      '',
      'Action required: approve or reject pending artifacts to resume generation.',
    ].join('\n')

    await getTransport().sendMail({
      from:    FROM,
      to:      process.env.SARSH_EMAIL ?? '',
      subject: '[MyAdvocate] ALERT: Review queue at capacity — generation paused',
      text,
    })
    return true
  } catch (err) {
    console.error('[mailer] sendCapacityAlert failed:', err)
    return false
  }
}
```

- [ ] **Step 2: Run tests and verify they pass**

```bash
npm test -- mailer
```

Expected: all 7 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mailer.ts src/__tests__/mailer.test.ts
git commit -m "feat: add YMYL review mailer (MA-SEC-002 P27)"
```

---

## Chunk 2: Queue Depth Guard

### Task 4: Write failing test for getReviewQueueDepth

**Files:**
- Modify: `src/lib/db/review-queue.ts`
- Create: `src/lib/db/__tests__/review-queue.test.ts`

- [ ] **Step 1: Write the failing test**

Check whether a test file already exists:
```bash
ls src/lib/db/__tests__/
```

If `review-queue.test.ts` exists, append to it. Otherwise create it:

```typescript
// src/lib/db/__tests__/review-queue.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn(() => ({ select: mockSelect }))

mockSelect.mockReturnValue({ eq: mockEq })
mockEq.mockResolvedValue({ count: 3, error: null })

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

import { getReviewQueueDepth } from '@/lib/db/review-queue'

describe('getReviewQueueDepth', () => {
  beforeEach(() => mockEq.mockClear())

  it('returns the count of pending review queue items', async () => {
    mockEq.mockResolvedValueOnce({ count: 7, error: null })
    const depth = await getReviewQueueDepth()
    expect(depth).toBe(7)
  })

  it('queries review_queue for pending decision', async () => {
    mockEq.mockResolvedValueOnce({ count: 2, error: null })
    await getReviewQueueDepth()
    expect(mockFrom).toHaveBeenCalledWith('review_queue')
    expect(mockEq).toHaveBeenCalledWith('decision', 'pending')
  })

  it('returns 0 on Supabase error (safe default)', async () => {
    mockEq.mockResolvedValueOnce({ count: null, error: new Error('db error') })
    const depth = await getReviewQueueDepth()
    expect(depth).toBe(0)
  })
})
```

- [ ] **Step 2: Run and verify the test fails**

```bash
npm test -- review-queue
```

Expected: FAIL — `getReviewQueueDepth is not a function`.

---

### Task 5: Implement getReviewQueueDepth

**Files:**
- Modify: `src/lib/db/review-queue.ts`

- [ ] **Step 1: Add function to review-queue.ts**

Append to the end of `src/lib/db/review-queue.ts`:

```typescript
/**
 * Returns the number of artifacts currently pending review.
 * MA-SEC-002 P27: Used to enforce the 10-artifact queue cap.
 * Returns 0 on error (safe default — prevents false capacity blocks).
 */
export async function getReviewQueueDepth(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('review_queue')
    .select('id', { count: 'exact', head: true })
    .eq('decision', 'pending')
  if (error) {
    console.error('[review-queue] getReviewQueueDepth failed:', error)
    return 0
  }
  return count ?? 0
}
```

- [ ] **Step 2: Run tests and verify they pass**

```bash
npm test -- review-queue
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/review-queue.ts src/lib/db/__tests__/review-queue.test.ts
git commit -m "feat: add getReviewQueueDepth for queue cap enforcement (MA-SEC-002 P27)"
```

---

## Chunk 3: Internal Notify Route

### Task 6: Write failing tests for notify-review route

**Files:**
- Create: `src/app/api/internal/notify-review/route.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// src/app/api/internal/notify-review/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Supabase service role client
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))

// Mock mailer
vi.mock('@/lib/mailer', () => ({
  sendReviewNotification: vi.fn().mockResolvedValue(true),
}))

import { POST } from './route'
import { sendReviewNotification } from '@/lib/mailer'

const MOCK_ARTIFACT = {
  id: 'art-123',
  artifact_type: 'denial_appeal',
  user_id: 'user-abc',
  created_at: '2026-03-13T12:00:00Z',
  release_state: 'review_required',
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/internal/notify-review', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/internal/notify-review', () => {
  beforeEach(() => {
    vi.mocked(sendReviewNotification).mockClear()
    mockSingle.mockResolvedValue({ data: MOCK_ARTIFACT, error: null })
  })

  it('returns 400 when artifactId is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when artifact not found in DB', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null })
    const res = await POST(makeRequest({ artifactId: 'missing' }))
    expect(res.status).toBe(404)
  })

  it('returns 200 and calls sendReviewNotification on success', async () => {
    const res = await POST(makeRequest({ artifactId: 'art-123' }))
    expect(res.status).toBe(200)
    expect(sendReviewNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'art-123', artifact_type: 'denial_appeal' })
    )
  })

  it('returns 500 when DB query fails', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('db fail') })
    const res = await POST(makeRequest({ artifactId: 'art-123' }))
    expect(res.status).toBe(500)
  })

  it('returns 500 but does not throw when sendReviewNotification returns false', async () => {
    vi.mocked(sendReviewNotification).mockResolvedValueOnce(false)
    const res = await POST(makeRequest({ artifactId: 'art-123' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})
```

- [ ] **Step 2: Run and verify tests fail**

```bash
npm test -- notify-review
```

Expected: FAIL — module not found.

---

### Task 7: Implement the notify-review route

**Files:**
- Create: `src/app/api/internal/notify-review/route.ts`

- [ ] **Step 1: Create the directory and route file**

```typescript
// src/app/api/internal/notify-review/route.ts
// MA-SEC-002 P27: Internal route — dispatches YMYL review email notification.
// Called fire-and-forget from the generate route after artifact creation.
// Not user-facing; no auth session required — uses service role key.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendReviewNotification } from '@/lib/mailer'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  let artifactId: string | undefined
  try {
    const body = await request.json()
    artifactId = body?.artifactId
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!artifactId || typeof artifactId !== 'string') {
    return NextResponse.json({ error: 'artifactId is required' }, { status: 400 })
  }

  // Query artifact — service role bypasses RLS so this works without user session
  const supabase = getServiceClient()
  const { data: artifact, error: dbError } = await supabase
    .from('artifacts')
    .select('id, artifact_type, user_id, created_at, release_state')
    .eq('id', artifactId)
    .single()

  if (dbError) {
    console.error('[notify-review] DB error:', dbError.message)
    return NextResponse.json({ error: 'Failed to query artifact' }, { status: 500 })
  }

  if (!artifact) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
  }

  const ok = await sendReviewNotification(artifact)
  if (!ok) {
    return NextResponse.json({ error: 'Email dispatch failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Run tests and verify they pass**

```bash
npm test -- notify-review
```

Expected: all 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/internal/notify-review/
git commit -m "feat: add internal notify-review route for YMYL review notifications (MA-SEC-002 P27)"
```

---

## Chunk 4: Wire into Generate Route

### Task 8: Write failing tests for queue depth guard in generate route

**Files:**
- Modify: `src/app/api/generate/route.ts`

Note: This task adds tests against the generate route. The test file for the route may not yet exist — create it:

- [ ] **Step 1: Check if route test exists**

```bash
ls src/app/api/generate/
```

If no test file exists, create `src/app/api/generate/route.test.ts`:

```typescript
// src/app/api/generate/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

vi.mock('@/lib/rate-limit', () => ({
  generateRateLimit: { limit: vi.fn().mockResolvedValue({ success: true, remaining: 9 }) },
}))

vi.mock('@/lib/db/cases', () => ({
  getCaseById: vi.fn().mockResolvedValue({ id: 'case-1', user_id: 'user-1' }),
}))

vi.mock('@/lib/generate-letter', () => ({
  generateLetter: vi.fn().mockResolvedValue({ id: 'art-1', content: 'Dear Insurer...' }),
}))

vi.mock('@/lib/db/friction-events', () => ({
  writeFrictionEvent: vi.fn().mockResolvedValue(undefined),
}))

// Queue depth mock — key for our new tests
const mockGetReviewQueueDepth = vi.fn().mockResolvedValue(0)
vi.mock('@/lib/db/review-queue', () => ({
  getReviewQueueDepth: mockGetReviewQueueDepth,
}))

// Capacity alert mock
const mockSendCapacityAlert = vi.fn().mockResolvedValue(true)
vi.mock('@/lib/mailer', () => ({
  sendCapacityAlert: mockSendCapacityAlert,
}))

// Mock Supabase createClient for subscription check
const mockSingle = vi.fn().mockResolvedValue({
  data: { subscription_status: 'active', role: 'user' },
  error: null,
})
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: mockSingle }),
      }),
    }),
  }),
}))

// Mock fetch for fire-and-forget notify call
const mockFetch = vi.fn().mockResolvedValue({ ok: true })
vi.stubGlobal('fetch', mockFetch)

import { POST } from './route'

function makeRequest(body = {}) {
  return new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    body: JSON.stringify({ caseId: 'case-1', caseData: {}, letterType: 'denial_appeal', ...body }),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/generate — queue depth guard (MA-SEC-002 P27)', () => {
  beforeEach(() => {
    mockGetReviewQueueDepth.mockClear()
    mockSendCapacityAlert.mockClear()
    mockFetch.mockClear()
  })

  it('returns 429 with QUEUE_CAP when queue depth is at cap (10)', async () => {
    mockGetReviewQueueDepth.mockResolvedValueOnce(10)
    const res = await POST(makeRequest())
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.code).toBe('QUEUE_CAP')
  })

  it('returns 429 when queue depth exceeds cap (>10)', async () => {
    mockGetReviewQueueDepth.mockResolvedValueOnce(12)
    const res = await POST(makeRequest())
    expect(res.status).toBe(429)
  })

  it('fires capacity alert to Sarsh when at cap', async () => {
    mockGetReviewQueueDepth.mockResolvedValueOnce(10)
    await POST(makeRequest())
    expect(mockSendCapacityAlert).toHaveBeenCalledTimes(1)
  })

  it('proceeds normally when queue depth is below cap (9)', async () => {
    mockGetReviewQueueDepth.mockResolvedValueOnce(9)
    const res = await POST(makeRequest())
    expect(res.status).toBe(201)
  })

  it('fires notify-review fetch after successful generation', async () => {
    mockGetReviewQueueDepth.mockResolvedValueOnce(0)
    await POST(makeRequest())
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/internal/notify-review'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('does not block letter delivery when notify fetch fails', async () => {
    mockGetReviewQueueDepth.mockResolvedValueOnce(0)
    mockFetch.mockRejectedValueOnce(new Error('network error'))
    const res = await POST(makeRequest())
    expect(res.status).toBe(201)
  })
})
```

- [ ] **Step 2: Run and verify tests fail**

```bash
npm test -- "generate/route"
```

Expected: FAIL — the route doesn't yet import the queue depth guard or mailer.

---

### Task 9: Wire queue depth guard and fire-and-forget notify into generate route

**Files:**
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Read the current generate route to find exact insertion points**

Current file: `src/app/api/generate/route.ts`

- [ ] **Step 2: Apply the changes**

Add imports at the top:

```typescript
import { getReviewQueueDepth } from '@/lib/db/review-queue'
import { sendCapacityAlert } from '@/lib/mailer'
```

After the rate-limit check (before `request.json()`), insert the queue depth guard:

```typescript
  // MA-SEC-002 P27: Queue depth cap — block generation when queue is full
  const queueDepth = await getReviewQueueDepth()
  if (queueDepth >= 10) {
    // Fire-and-forget capacity alert to Sarsh
    sendCapacityAlert().catch((err) =>
      console.error('[generate] sendCapacityAlert failed:', err)
    )
    return NextResponse.json(
      { error: 'review_queue_full', code: 'QUEUE_CAP' },
      { status: 429 }
    )
  }
```

After the `generateLetter()` call (and before the friction event writes), insert the fire-and-forget notify call:

```typescript
  // MA-SEC-002 P27: Fire-and-forget review notification — must never block letter delivery
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  fetch(`${appUrl}/api/internal/notify-review`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ artifactId: artifact.id }),
  }).catch((err) => console.error('[generate] notify-review fire-and-forget failed:', err))
```

- [ ] **Step 3: Run tests and verify they pass**

```bash
npm test -- "generate/route"
```

Expected: all 6 new tests pass. Run full suite to confirm no regressions:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/generate/route.ts src/app/api/generate/route.test.ts
git commit -m "feat: wire YMYL queue depth guard and review notification into generate route (MA-SEC-002 P27)"
```

---

## Chunk 5: Environment Variables

### Task 10: Update .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Append SMTP and reviewer email vars to .env.example**

Add a new section at the end of `.env.example`:

```
# YMYL Review Notifications (MA-SEC-002 P27)
# Google Workspace SMTP — use an App Password, not your account password
# Generate at: myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=admin@getmyadvocate.org
SMTP_PASS=your-google-workspace-app-password

# Reviewer email addresses — both receive new artifact notifications
KATE_EMAIL=kate@example.com
SARSH_EMAIL=sarsh@example.com
```

- [ ] **Step 2: Verify .env is NOT modified (only .env.example)**

```bash
git diff .env
```

Expected: no output — `.env` is untouched.

- [ ] **Step 3: Run full test suite one final time**

```bash
npm test
```

Expected: all tests pass, no failures.

- [ ] **Step 4: Final commit**

```bash
git add .env.example
git commit -m "chore: add SMTP and reviewer email env vars to .env.example (MA-SEC-002 P27)"
```

---

## Summary of Changes

| File | Action | Purpose |
|---|---|---|
| `src/lib/mailer.ts` | Create | nodemailer SMTP logic — `sendReviewNotification` + `sendCapacityAlert` |
| `src/lib/db/review-queue.ts` | Modify | Add `getReviewQueueDepth()` |
| `src/app/api/internal/notify-review/route.ts` | Create | Internal POST endpoint — queries artifact, dispatches email |
| `src/app/api/generate/route.ts` | Modify | Queue depth guard (429 + Sarsh alert) + fire-and-forget notify |
| `.env.example` | Modify | Add SMTP_HOST/PORT/USER/PASS, KATE_EMAIL, SARSH_EMAIL |
| `src/__tests__/mailer.test.ts` | Create | Tests for mailer functions |
| `src/lib/db/__tests__/review-queue.test.ts` | Create/Modify | Tests for getReviewQueueDepth |
| `src/app/api/internal/notify-review/route.test.ts` | Create | Tests for notify route |
| `src/app/api/generate/route.test.ts` | Create | Tests for queue guard + notify wiring |
| `package.json` | Modify | Add nodemailer + @types/nodemailer |

## Post-Ship Actions (not in this plan)

1. Configure KATE_EMAIL and SARSH_EMAIL in Vercel production environment variables
2. Generate a Google Workspace App Password for `admin@getmyadvocate.org` (not the login password)
3. Test with a staging artifact before go-live — send one test artifact and confirm both Kate and Sarsh receive email
4. Update MA-SEC-002 P27 PassFail: `[ ]` → `[x]` in Google Drive doc
