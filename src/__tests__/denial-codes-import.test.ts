// src/__tests__/denial-codes-import.test.ts
// Integration tests — run against local Supabase (supabase start required).
// Skipped automatically in CI when SUPABASE_SERVICE_ROLE_KEY is not set.

import { describe, it, expect, vi } from 'vitest'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Mock the Next.js server Supabase client so tests can run outside a request context.
// createClient() is swapped for a service-role client that uses env vars directly.
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () =>
    createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    ),
  createServiceRoleClient: () =>
    createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    ),
}))

import { getAllDenialCodes, getDenialCodeByCode, getRelatedDenialCodes } from '@/lib/db/denial-codes'

const RUN = !!process.env.SUPABASE_SERVICE_ROLE_KEY

describe.skipIf(!RUN)('denial_codes — post-import integration', () => {
  // Test 1: Seed count
  it('getAllDenialCodes returns at least 260 rows', async () => {
    const codes = await getAllDenialCodes()
    expect(codes.length).toBeGreaterThanOrEqual(260)
  })

  // Test 2: Lookup by code
  it('getDenialCodeByCode("CO-50") returns a record with non-null appeal_angle', async () => {
    const code = await getDenialCodeByCode('CO-50')
    expect(code).not.toBeNull()
    expect(code!.appeal_angle).not.toBeNull()
    expect(code!.plain_language_explanation.length).toBeGreaterThan(10)
  })

  // Test 3: Top-50 enrichment
  it('CO-50 has non-null common_causes and appeal_angle', async () => {
    const code = await getDenialCodeByCode('CO-50')
    expect(code!.common_causes).not.toBeNull()
    expect(code!.appeal_angle).not.toBeNull()
  })

  // Test 4: Category filter
  it('at least one record exists with category = medical_necessity', async () => {
    const all = await getAllDenialCodes()
    const medNec = all.filter(c => c.category === 'medical_necessity')
    expect(medNec.length).toBeGreaterThanOrEqual(1)
  })

  // Test 5: Related codes helper
  it('getRelatedDenialCodes returns one record per valid code', async () => {
    const results = await getRelatedDenialCodes(['CO-50', 'CO-96'])
    expect(results.length).toBe(2)
    expect(results.map(r => r.code)).toContain('CO-50')
    expect(results.map(r => r.code)).toContain('CO-96')
  })

  // Test 6: Lookup for a thin (needs_review) code
  it('a thin code (CO-1) exists with explanation but null appeal_angle', async () => {
    const code = await getDenialCodeByCode('CO-1')
    expect(code).not.toBeNull()
    expect(code!.plain_language_explanation.length).toBeGreaterThan(10)
    expect(code!.appeal_angle).toBeNull()
    expect(code!.review_status).toBe('needs_review')
  })
})
