import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}))

import { logEvent } from '@/lib/db/metric-events'

// Helper: vitest mock typing requires `as unknown as T` to avoid no-explicit-any
type MockSupabaseClient = { from: ReturnType<typeof vi.fn>; insert: ReturnType<typeof vi.fn> }

async function getInsertSpy(): Promise<ReturnType<typeof vi.fn>> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await (createClient as unknown as () => Promise<MockSupabaseClient>)()
  return supabase.from().insert
}

describe('logEvent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts only allowed fields — no PII', async () => {
    const insertSpy = await getInsertSpy()
    await logEvent({ eventType: 'tool_use', sourcePage: '/tools/denial-decoder', toolName: 'denial_decoder' })

    const inserted = insertSpy.mock.calls[0][0]
    // MA-SEC-002 P13: NEVER email, name, or identifiable PII
    expect(inserted).not.toHaveProperty('email')
    expect(inserted).not.toHaveProperty('name')
    expect(inserted).toHaveProperty('event_type', 'tool_use')
    expect(inserted).toHaveProperty('source_page', '/tools/denial-decoder')
  })

  it('passes userId (auth UUID) through as user_id', async () => {
    const insertSpy = await getInsertSpy()
    await logEvent({
      eventType: 'letter_generated',
      sourcePage: '/api/generate',
      toolName: 'denial_appeal',
      userId: 'user-uuid-123',
      caseId: 'case-uuid-456',
    })

    const inserted = insertSpy.mock.calls[0][0]
    expect(inserted).toHaveProperty('user_id', 'user-uuid-123')
    expect(inserted).toHaveProperty('case_id', 'case-uuid-456')
    expect(inserted).toHaveProperty('event_type', 'letter_generated')
  })

  it('passes amountCents for revenue events', async () => {
    const insertSpy = await getInsertSpy()
    await logEvent({
      eventType: 'per_case_purchased',
      sourcePage: '/api/stripe/webhook',
      userId: 'user-uuid-789',
      amountCents: 1300,
    })

    const inserted = insertSpy.mock.calls[0][0]
    expect(inserted).toHaveProperty('amount_cents', 1300)
    expect(inserted).toHaveProperty('event_type', 'per_case_purchased')
  })

  it('nulls out optional fields when not provided', async () => {
    const insertSpy = await getInsertSpy()
    await logEvent({ eventType: 'page_view', sourcePage: '/home' })

    const inserted = insertSpy.mock.calls[0][0]
    expect(inserted.user_id).toBeNull()
    expect(inserted.amount_cents).toBeNull()
    expect(inserted.subscription_id).toBeNull()
  })
})
