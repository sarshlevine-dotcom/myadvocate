/**
 * Tests for the denial-code publishing pipeline (H1-10)
 *
 * Tests against the actual page exports — no Supabase, no Redis.
 *
 * Covers:
 *   - generateStaticParams() returns one slug per DB row
 *   - generateMetadata() returns correct title for a known code
 *   - Page calls notFound() for an unknown code param
 *   - Page output contains JSON-LD (FAQPage schema)
 *   - Related codes are linked in page output (internal linking invariant #11)
 *   - Hub page (index) lists all codes grouped by category
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import React from 'react'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mockGetAllDenialCodes    = vi.hoisted(() => vi.fn())
const mockGetDenialCodeByCode  = vi.hoisted(() => vi.fn())
const mockNotFound             = vi.hoisted(() => vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }))

vi.mock('@/lib/db/denial-codes', () => ({
  getAllDenialCodes:   mockGetAllDenialCodes,
  getDenialCodeByCode: mockGetDenialCodeByCode,
}))

vi.mock('next/navigation', () => ({ notFound: mockNotFound }))

// next/link renders a plain <a> in server/test context — mock to avoid Next internals
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) =>
    React.createElement('a', { href, ...rest }, children),
}))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import DenialCodePage, {
  generateStaticParams,
  generateMetadata,
} from '@/app/denial-codes/[code]/page'

import DenialCodesIndexPage from '@/app/denial-codes/page'

// ─── Fixture ──────────────────────────────────────────────────────────────────

const CO4_FIXTURE = {
  id:                        'id-001',
  code:                      'CO-4',
  category:                  'other',
  plain_language_explanation: 'The procedure code is inconsistent with the modifier used.',
  recommended_action:        'Review the modifier and resubmit the claim.',
  source:                    'NUBC',
  updated_at:                '2026-01-01T00:00:00Z',
  target_keyword:            'CO-4 denial',
  search_volume:             1200,
  tool_route:                '/tools/denial-decoder',
  cluster_id:                'cluster_0007',
  common_causes:             'Incorrect modifier applied',
  appeal_angle:              'Document medical necessity for the modifier used',
  related_codes:             ['CO-16', 'CO-45'],
  tool_cta_id:               'denial_decoder',
}

const CO50_FIXTURE = {
  ...CO4_FIXTURE,
  id:                        'id-002',
  code:                      'CO-50',
  category:                  'medical_necessity',
  plain_language_explanation: 'The service was not medically necessary.',
  recommended_action:        'Obtain a letter of medical necessity and file an appeal.',
  related_codes:             [],
}

// ─── generateStaticParams ─────────────────────────────────────────────────────

describe('generateStaticParams', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns one slug entry per denial code in the DB', async () => {
    mockGetAllDenialCodes.mockResolvedValue([CO4_FIXTURE, CO50_FIXTURE])
    const params = await generateStaticParams()
    expect(params).toHaveLength(2)
  })

  it('uses lowercase code as the URL slug', async () => {
    mockGetAllDenialCodes.mockResolvedValue([CO4_FIXTURE])
    const params = await generateStaticParams()
    expect(params[0].code).toBe('co-4')
  })

  it('returns empty array when DB has no denial codes', async () => {
    mockGetAllDenialCodes.mockResolvedValue([])
    const params = await generateStaticParams()
    expect(params).toHaveLength(0)
  })
})

// ─── generateMetadata ─────────────────────────────────────────────────────────

describe('generateMetadata', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns title containing the code for a known code', async () => {
    mockGetDenialCodeByCode.mockResolvedValue(CO4_FIXTURE)
    const meta = await generateMetadata({ params: Promise.resolve({ code: 'co-4' }) })
    expect((meta as { title?: string }).title).toMatch(/CO-4/)
  })

  it('normalises the param to uppercase before DB lookup', async () => {
    mockGetDenialCodeByCode.mockResolvedValue(CO4_FIXTURE)
    await generateMetadata({ params: Promise.resolve({ code: 'co-4' }) })
    expect(mockGetDenialCodeByCode).toHaveBeenCalledWith('CO-4')
  })

  it('returns fallback metadata for an unknown code', async () => {
    mockGetDenialCodeByCode.mockResolvedValue(null)
    const meta = await generateMetadata({ params: Promise.resolve({ code: 'xx-999' }) })
    expect(meta).toBeDefined()
  })

  it('includes a canonical URL in alternates', async () => {
    mockGetDenialCodeByCode.mockResolvedValue(CO4_FIXTURE)
    const meta = await generateMetadata({ params: Promise.resolve({ code: 'co-4' }) }) as {
      alternates?: { canonical?: string }
    }
    expect(meta.alternates?.canonical).toContain('/denial-codes/co-4')
  })
})

// ─── DenialCodePage ───────────────────────────────────────────────────────────

describe('DenialCodePage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls notFound() for an unknown code', async () => {
    mockGetDenialCodeByCode.mockResolvedValue(null)
    await expect(
      DenialCodePage({ params: Promise.resolve({ code: 'xx-999' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('renders the denial code in the page output', async () => {
    mockGetDenialCodeByCode.mockResolvedValue(CO4_FIXTURE)
    const element = await DenialCodePage({ params: Promise.resolve({ code: 'co-4' }) })
    const html = renderToString(element as React.ReactElement)
    expect(html).toContain('CO-4')
  })

  it('renders the plain-language explanation', async () => {
    mockGetDenialCodeByCode.mockResolvedValue(CO4_FIXTURE)
    const element = await DenialCodePage({ params: Promise.resolve({ code: 'co-4' }) })
    const html = renderToString(element as React.ReactElement)
    expect(html).toContain(CO4_FIXTURE.plain_language_explanation)
  })

  it('renders the recommended action', async () => {
    mockGetDenialCodeByCode.mockResolvedValue(CO4_FIXTURE)
    const element = await DenialCodePage({ params: Promise.resolve({ code: 'co-4' }) })
    const html = renderToString(element as React.ReactElement)
    expect(html).toContain(CO4_FIXTURE.recommended_action)
  })

  it('includes JSON-LD script with FAQPage type', async () => {
    mockGetDenialCodeByCode.mockResolvedValue(CO4_FIXTURE)
    const element = await DenialCodePage({ params: Promise.resolve({ code: 'co-4' }) })
    const html = renderToString(element as React.ReactElement)
    expect(html).toContain('application/ld+json')
    expect(html).toContain('FAQPage')
  })

  it('links to related codes (internal linking — invariant #11)', async () => {
    mockGetDenialCodeByCode.mockResolvedValue(CO4_FIXTURE) // related_codes: ['CO-16', 'CO-45']
    const element = await DenialCodePage({ params: Promise.resolve({ code: 'co-4' }) })
    const html = renderToString(element as React.ReactElement)
    expect(html).toContain('/denial-codes/co-16')
    expect(html).toContain('/denial-codes/co-45')
  })

  it('includes a link to the Denial Decoder tool', async () => {
    mockGetDenialCodeByCode.mockResolvedValue(CO4_FIXTURE)
    const element = await DenialCodePage({ params: Promise.resolve({ code: 'co-4' }) })
    const html = renderToString(element as React.ReactElement)
    expect(html).toContain('/tools/denial-decoder')
  })
})

// ─── DenialCodesIndexPage (hub page) ─────────────────────────────────────────

describe('DenialCodesIndexPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders a link to each denial code page', async () => {
    mockGetAllDenialCodes.mockResolvedValue([CO4_FIXTURE, CO50_FIXTURE])
    const element = await DenialCodesIndexPage()
    const html = renderToString(element as React.ReactElement)
    expect(html).toContain('/denial-codes/co-4')
    expect(html).toContain('/denial-codes/co-50')
  })

  it('groups codes by category', async () => {
    mockGetAllDenialCodes.mockResolvedValue([CO4_FIXTURE, CO50_FIXTURE])
    const element = await DenialCodesIndexPage()
    const html = renderToString(element as React.ReactElement)
    // CO-4 is 'other', CO-50 is 'medical_necessity'
    expect(html).toContain('Medical Necessity')
  })

  it('renders with an empty DB without throwing', async () => {
    mockGetAllDenialCodes.mockResolvedValue([])
    const element = await DenialCodesIndexPage()
    const html = renderToString(element as React.ReactElement)
    expect(html).toBeDefined()
  })
})
