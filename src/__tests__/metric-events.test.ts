import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}))

import { logEvent } from '@/lib/db/metric-events'

describe('logEvent', () => {
  it('inserts only allowed fields', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await (createClient as any)()
    const insertSpy = supabase.from().insert

    await logEvent({ eventType: 'tool_use', sourcePage: '/tools/denial-decoder', toolName: 'denial_decoder' })

    const inserted = insertSpy.mock.calls[0][0]
    // Should NOT contain any user PII
    expect(inserted).not.toHaveProperty('userId')
    expect(inserted).not.toHaveProperty('email')
    expect(inserted).not.toHaveProperty('name')
    expect(inserted).toHaveProperty('event_type', 'tool_use')
    expect(inserted).toHaveProperty('source_page', '/tools/denial-decoder')
  })
})
