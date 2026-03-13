import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock setup ───────────────────────────────────────────────────────────────
// Using vi.hoisted so mocks are available in the factory closures above imports.

const mockSubSingle   = vi.hoisted(() => vi.fn())
const mockArtifactGte = vi.hoisted(() => vi.fn())
const mockFrom        = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))

// Import under test — after mocks
import { checkTierAuthorization } from '@/lib/auth-tier'

// ─── Chain builders ──────────────────────────────────────────────────────────
// These assemble the query chain objects returned by mockFrom.

function mockSubscription(response: { data: { status: string } | null; error: { code: string } | null }) {
  mockSubSingle.mockResolvedValue(response)
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: mockSubSingle,
      }),
    }),
  }
}

function mockArtifactCount(response: { count: number | null; error: null | { message: string; code?: string } }) {
  mockArtifactGte.mockResolvedValue(response)
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: mockArtifactGte,
      }),
    }),
  }
}

// Configures mockFrom to return the right chain based on table name
function setupMocks(opts: {
  subscription: { data: { status: string } | null; error: { code: string } | null }
  artifactCount?: { count: number | null; error: null | { message: string; code?: string } }
}) {
  const subChain = mockSubscription(opts.subscription)
  const artChain = mockArtifactCount(opts.artifactCount ?? { count: 0, error: null })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'subscriptions') return subChain
    if (table === 'artifacts')    return artChain
    throw new Error(`Unexpected table: ${table}`)
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('checkTierAuthorization', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Free tier ─────────────────────────────────────────────────────────────

  describe('free tier (no subscription)', () => {
    const NO_ROWS = { data: null, error: { code: 'PGRST116' } }

    it('authorizes a free user with 0 prior letters this month', async () => {
      setupMocks({ subscription: NO_ROWS, artifactCount: { count: 0, error: null } })
      const result = await checkTierAuthorization('user-free', 'denial_appeal')
      expect(result).toEqual({ authorized: true })
    })

    it('blocks a free user who has already generated 1 letter this month (count === limit)', async () => {
      setupMocks({ subscription: NO_ROWS, artifactCount: { count: 1, error: null } })
      const result = await checkTierAuthorization('user-free', 'denial_appeal')
      expect(result).toEqual({
        authorized: false,
        reason: 'generation_limit_reached',
        code: 'AUTH_LIMIT',
      })
    })

    it('authorizes a free user when artifact count returns null (null coerces to 0, under the limit)', async () => {
      // count: null can happen when the table has no matching rows via count query
      // In practice count should be 0, but guard against null just in case
      // null ?? 0 === 0 → 0 < 1 → authorized (not blocked by count, null treated as 0)
      setupMocks({ subscription: NO_ROWS, artifactCount: { count: null, error: null } })
      const result = await checkTierAuthorization('user-free', 'denial_appeal')
      expect(result).toEqual({ authorized: true })
    })

    it('blocks a free user when the artifact count query itself errors (conservative)', async () => {
      setupMocks({ subscription: NO_ROWS, artifactCount: { count: null, error: { message: 'DB error' } } })
      const result = await checkTierAuthorization('user-free', 'denial_appeal')
      expect(result).toEqual({
        authorized: false,
        reason: 'generation_limit_reached',
        code: 'AUTH_LIMIT',
      })
    })

    it('authorizes all 4 letter types for a free user under the limit', async () => {
      const letterTypes = ['denial_appeal', 'bill_dispute', 'hipaa_request', 'negotiation_script'] as const
      for (const lt of letterTypes) {
        setupMocks({ subscription: NO_ROWS, artifactCount: { count: 0, error: null } })
        const result = await checkTierAuthorization('user-free', lt)
        expect(result.authorized).toBe(true)
      }
    })
  })

  // ── Paid tier ─────────────────────────────────────────────────────────────

  describe('paid tier (active subscription)', () => {
    const ACTIVE_SUB = { data: { status: 'active' }, error: null }

    it('authorizes a paid user with 0 letters', async () => {
      setupMocks({ subscription: ACTIVE_SUB, artifactCount: { count: 0, error: null } })
      const result = await checkTierAuthorization('user-paid', 'denial_appeal')
      expect(result).toEqual({ authorized: true })
    })

    it('authorizes a paid user with many letters (count is not checked for paid tier)', async () => {
      setupMocks({ subscription: ACTIVE_SUB, artifactCount: { count: 99, error: null } })
      const result = await checkTierAuthorization('user-paid', 'denial_appeal')
      expect(result).toEqual({ authorized: true })
    })

    it('does NOT query the artifacts table for a paid user (short-circuit)', async () => {
      setupMocks({ subscription: ACTIVE_SUB })
      await checkTierAuthorization('user-paid', 'denial_appeal')
      // artifacts.select should not have been called
      expect(mockArtifactGte).not.toHaveBeenCalled()
    })
  })

  // ── Lapsed paid tier ──────────────────────────────────────────────────────

  describe('lapsed paid tier (past_due or canceled)', () => {
    it('blocks a past_due subscriber with AUTH_TIER', async () => {
      setupMocks({ subscription: { data: { status: 'past_due' }, error: null } })
      const result = await checkTierAuthorization('user-lapsed', 'denial_appeal')
      expect(result).toEqual({
        authorized: false,
        reason: 'tier_insufficient',
        code: 'AUTH_TIER',
      })
    })

    it('blocks a canceled subscriber with AUTH_TIER', async () => {
      setupMocks({ subscription: { data: { status: 'canceled' }, error: null } })
      const result = await checkTierAuthorization('user-canceled', 'bill_dispute')
      expect(result).toEqual({
        authorized: false,
        reason: 'tier_insufficient',
        code: 'AUTH_TIER',
      })
    })
  })

  // ── Unknown / missing user ────────────────────────────────────────────────

  describe('unknown or missing user', () => {
    it('blocks when userId is empty string', async () => {
      const result = await checkTierAuthorization('', 'denial_appeal')
      expect(result).toEqual({
        authorized: false,
        reason: 'user_not_found',
        code: 'AUTH_USER',
      })
      // Should not have queried Supabase at all
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('blocks when subscription query returns an unexpected DB error', async () => {
      setupMocks({
        subscription: { data: null, error: { code: '500' } }, // non-PGRST116 error
      })
      const result = await checkTierAuthorization('user-unknown', 'denial_appeal')
      expect(result).toEqual({
        authorized: false,
        reason: 'user_not_found',
        code: 'AUTH_USER',
      })
    })
  })

  // ── Letter type guard ─────────────────────────────────────────────────────

  describe('letter type permission', () => {
    it('blocks an unknown letter type (future-proofing guard)', async () => {
      // This guard protects against callers passing arbitrary strings
      const result = await checkTierAuthorization('user-any', 'unknown_type')
      expect(result).toEqual({
        authorized: false,
        reason: 'tier_insufficient',
        code: 'AUTH_TIER',
      })
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })
})
