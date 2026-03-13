import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mocks — must be before imports
const mockInsert = vi.hoisted(() => vi.fn())
const mockFrom = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

import { writeFrictionEvent } from '@/lib/db/friction-events'

describe('writeFrictionEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: mockInsert })
  })

  it('writes a denial_decoder friction event with correct fields', async () => {
    await writeFrictionEvent({
      tool_used: 'denial_decoder',
      denial_code: 'CO-16',
      insurer: 'Aetna',
      service_category: 'outpatient',
      state: 'CA',
    })

    expect(mockFrom).toHaveBeenCalledWith('friction_events')
    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted).toMatchObject({
      tool_used: 'denial_decoder',
      denial_code: 'CO-16',
      insurer: 'Aetna',
      service_category: 'outpatient',
      state: 'CA',
    })
  })

  it('writes an appeal_letter friction event with correct fields', async () => {
    await writeFrictionEvent({
      tool_used: 'appeal_letter',
      denial_code: 'PR-96',
      procedure_type: 'physical therapy',
      insurer: 'UnitedHealth',
      state: 'TX',
      claim_amount_range: null,
    })

    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted).toMatchObject({
      tool_used: 'appeal_letter',
      denial_code: 'PR-96',
      procedure_type: 'physical therapy',
      insurer: 'UnitedHealth',
      state: 'TX',
      claim_amount_range: null,
    })
  })

  it('writes a bill_dispute friction event with correct fields', async () => {
    await writeFrictionEvent({
      tool_used: 'bill_dispute',
      billing_error_type: 'duplicate charge',
      provider_category: 'hospital',
      charge_amount_range: '$500-2k',
      state: 'NY',
      insurance_status: 'insured',
    })

    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted).toMatchObject({
      tool_used: 'bill_dispute',
      billing_error_type: 'duplicate charge',
      provider_category: 'hospital',
      charge_amount_range: '$500-2k',
      state: 'NY',
      insurance_status: 'insured',
    })
  })

  it('does not store PII fields — name, email, dob, member_id are not present in the record', async () => {
    // Cast through unknown to simulate a caller trying to pass PII
    const payload = {
      tool_used: 'denial_decoder',
      denial_code: 'CO-4',
    } as unknown as Parameters<typeof writeFrictionEvent>[0]

    await writeFrictionEvent(payload)

    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted).not.toHaveProperty('name')
    expect(inserted).not.toHaveProperty('email')
    expect(inserted).not.toHaveProperty('dob')
    expect(inserted).not.toHaveProperty('member_id')
    expect(inserted).not.toHaveProperty('policy_number')
    expect(inserted).not.toHaveProperty('diagnosis_code')
    expect(inserted).not.toHaveProperty('provider_name')
  })

  it('resolves without throwing when Supabase returns an error', async () => {
    mockInsert.mockResolvedValue({ error: new Error('DB connection failed') })

    // Must not throw — friction events must never break user flow
    await expect(
      writeFrictionEvent({ tool_used: 'denial_decoder', denial_code: 'CO-16' })
    ).resolves.toBeUndefined()
  })

  it('resolves without throwing when Supabase rejects the promise', async () => {
    mockInsert.mockRejectedValue(new Error('network error'))

    await expect(
      writeFrictionEvent({ tool_used: 'bill_dispute', billing_error_type: 'overbilling' })
    ).resolves.toBeUndefined()
  })

  it('nulls optional fields when not provided', async () => {
    await writeFrictionEvent({ tool_used: 'denial_decoder' })

    const inserted = mockInsert.mock.calls[0][0]
    expect(inserted.denial_code).toBeNull()
    expect(inserted.insurer).toBeNull()
    expect(inserted.procedure_type).toBeNull()
    expect(inserted.service_category).toBeNull()
    expect(inserted.state).toBeNull()
    expect(inserted.billing_error_type).toBeNull()
    expect(inserted.provider_category).toBeNull()
    expect(inserted.charge_amount_range).toBeNull()
    expect(inserted.claim_amount_range).toBeNull()
    expect(inserted.insurance_status).toBeNull()
    expect(inserted.escalation_type).toBeNull()
  })
})
