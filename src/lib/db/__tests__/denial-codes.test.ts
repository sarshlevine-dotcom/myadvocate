import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mock setup — must be before imports
const mockIn = vi.hoisted(() => vi.fn())
const mockOrder = vi.hoisted(() => vi.fn())
const mockSelect = vi.hoisted(() => vi.fn())
const mockFrom = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

import { getRelatedDenialCodes } from '@/lib/db/denial-codes'

const MOCK_CODES = [
  {
    id: 'uuid-1',
    code: 'CO-4',
    category: 'prior_auth',
    plain_language_explanation: "The service is inconsistent with the patient's age.",
    recommended_action: 'Request a peer-to-peer review.',
    source: 'CARC',
    updated_at: '2026-01-01T00:00:00Z',
    common_causes: 'Age criteria mismatch.',
    appeal_angle: 'Submit physician attestation.',
    related_codes: ['CO-197', 'CO-234'],
    tool_cta_id: 'appeal_generator',
  },
  {
    id: 'uuid-2',
    code: 'CO-16',
    category: 'other',
    plain_language_explanation: 'Claim lacks information.',
    recommended_action: 'Resubmit with complete information.',
    source: 'CARC',
    updated_at: '2026-01-01T00:00:00Z',
    common_causes: 'Missing required fields.',
    appeal_angle: 'Identify and add missing fields.',
    related_codes: ['CO-11'],
    tool_cta_id: 'denial_decoder',
  },
]

describe('getRelatedDenialCodes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Fully restore mock chain after clearAllMocks
    mockOrder.mockResolvedValue({ data: MOCK_CODES, error: null })
    mockIn.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ in: mockIn })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  it('returns codes matching the given code strings', async () => {
    const result = await getRelatedDenialCodes(['CO-4', 'CO-16'])
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.code)).toContain('CO-4')
    expect(result.map((c) => c.code)).toContain('CO-16')
  })

  it('queries the denial_codes table with in() filter on uppercased codes', async () => {
    await getRelatedDenialCodes(['co-4', 'CO-16'])
    expect(mockFrom).toHaveBeenCalledWith('denial_codes')
    expect(mockSelect).toHaveBeenCalled()
    expect(mockIn).toHaveBeenCalledWith('code', ['CO-4', 'CO-16'])
    expect(mockOrder).toHaveBeenCalledWith('code')
  })

  it('returns empty array when no codes match', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    const result = await getRelatedDenialCodes(['NONEXISTENT'])
    expect(result).toEqual([])
  })

  it('throws when Supabase returns an error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') })
    await expect(getRelatedDenialCodes(['CO-4'])).rejects.toThrow('DB error')
  })

  it('returns empty array for empty input without querying the database', async () => {
    const result = await getRelatedDenialCodes([])
    expect(result).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
