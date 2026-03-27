/**
 * Unit tests for content_items validation rules (H1-07)
 *
 * Tests validateContentItem() in isolation — no Supabase, no I/O.
 * Each rule is exercised with a passing fixture and one or more failing fixtures.
 *
 * The validator is adapted to the real content_items schema:
 *   - title_working  (not "title")
 *   - status         (not "release_state") — enum: idea|queued|drafted|in_review|approved|active|archived
 *   - summary        (closest analog to "body" — checked for items in drafted/in_review/approved/active)
 *   - source_asset_id — denial_code reference when source_asset_type = 'denial_code'
 */

import { describe, it, expect } from 'vitest'
import {
  validateContentItem,
  KNOWN_STATUS_VALUES,
  KNOWN_CONTENT_TYPES,
  SLUG_PATTERN,
  type ContentItemRow,
} from '@/lib/content-item-validator'

// ─── Test fixture ─────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<ContentItemRow> = {}): ContentItemRow {
  return {
    id:               'row-001',
    slug:             'how-to-appeal-a-denial',
    title_working:    'How to Appeal an Insurance Denial',
    summary:          null,
    pillar:           'insurance-appeals',
    content_type:     'article',
    source_asset_type: 'none',
    source_asset_id:  null,
    ymyl_tier:        2,
    status:           'idea',
    ...overrides,
  }
}

const VALID_DENIAL_CODES = new Set(['CO-4', 'CO-29', 'PR-96'])

// ─── title_working ────────────────────────────────────────────────────────────

describe('title_working validation', () => {
  it('passes for a valid 10–100 char title', () => {
    const violations = validateContentItem(makeItem({ title_working: 'How to Appeal an Insurance Denial' }), VALID_DENIAL_CODES)
    const titleViolations = violations.filter(v => v.field === 'title_working')
    expect(titleViolations).toHaveLength(0)
  })

  it('fails when title_working is empty string', () => {
    const violations = validateContentItem(makeItem({ title_working: '' }), VALID_DENIAL_CODES)
    const v = violations.find(v => v.field === 'title_working')
    expect(v).toBeDefined()
    expect(v!.rule).toBe('min_10_chars')
  })

  it('fails when title_working is fewer than 10 chars', () => {
    const violations = validateContentItem(makeItem({ title_working: 'Short' }), VALID_DENIAL_CODES)
    const v = violations.find(v => v.field === 'title_working')
    expect(v).toBeDefined()
    expect(v!.rule).toBe('min_10_chars')
  })

  it('fails when title_working is longer than 100 chars', () => {
    const long = 'A'.repeat(101)
    const violations = validateContentItem(makeItem({ title_working: long }), VALID_DENIAL_CODES)
    const v = violations.find(v => v.field === 'title_working')
    expect(v).toBeDefined()
    expect(v!.rule).toBe('max_100_chars')
  })

  it('passes at exactly 10 chars (boundary)', () => {
    const violations = validateContentItem(makeItem({ title_working: '1234567890' }), VALID_DENIAL_CODES)
    expect(violations.filter(v => v.field === 'title_working')).toHaveLength(0)
  })

  it('passes at exactly 100 chars (boundary)', () => {
    const violations = validateContentItem(makeItem({ title_working: 'A'.repeat(100) }), VALID_DENIAL_CODES)
    expect(violations.filter(v => v.field === 'title_working')).toHaveLength(0)
  })
})

// ─── slug ─────────────────────────────────────────────────────────────────────

describe('slug validation', () => {
  it('passes for a valid lowercase-hyphens slug', () => {
    const violations = validateContentItem(makeItem({ slug: 'how-to-appeal-co-4-denial' }), VALID_DENIAL_CODES)
    expect(violations.filter(v => v.field === 'slug')).toHaveLength(0)
  })

  it('passes for a single-word slug', () => {
    const violations = validateContentItem(makeItem({ slug: 'guide' }), VALID_DENIAL_CODES)
    expect(violations.filter(v => v.field === 'slug')).toHaveLength(0)
  })

  it('fails for a slug containing uppercase letters', () => {
    const violations = validateContentItem(makeItem({ slug: 'Appeal-Letter' }), VALID_DENIAL_CODES)
    expect(violations.find(v => v.field === 'slug')).toBeDefined()
  })

  it('fails for a slug containing spaces', () => {
    const violations = validateContentItem(makeItem({ slug: 'appeal letter' }), VALID_DENIAL_CODES)
    expect(violations.find(v => v.field === 'slug')).toBeDefined()
  })

  it('fails for a slug containing underscores', () => {
    const violations = validateContentItem(makeItem({ slug: 'appeal_letter' }), VALID_DENIAL_CODES)
    expect(violations.find(v => v.field === 'slug')).toBeDefined()
  })

  it('fails for an empty slug', () => {
    const violations = validateContentItem(makeItem({ slug: '' }), VALID_DENIAL_CODES)
    expect(violations.find(v => v.field === 'slug')).toBeDefined()
  })

  it('fails for a slug starting with a hyphen', () => {
    const violations = validateContentItem(makeItem({ slug: '-appeal-letter' }), VALID_DENIAL_CODES)
    expect(violations.find(v => v.field === 'slug')).toBeDefined()
  })
})

// ─── content_type ─────────────────────────────────────────────────────────────

describe('content_type validation', () => {
  it('passes for each known content type', () => {
    for (const ct of KNOWN_CONTENT_TYPES) {
      const violations = validateContentItem(makeItem({ content_type: ct }), VALID_DENIAL_CODES)
      expect(violations.filter(v => v.field === 'content_type')).toHaveLength(0)
    }
  })

  it('fails for an unknown content_type value', () => {
    const violations = validateContentItem(makeItem({ content_type: 'random_unknown_type' }), VALID_DENIAL_CODES)
    const v = violations.find(v => v.field === 'content_type')
    expect(v).toBeDefined()
    expect(v!.rule).toBe('unknown_value')
  })

  it('fails for an empty content_type', () => {
    const violations = validateContentItem(makeItem({ content_type: '' }), VALID_DENIAL_CODES)
    expect(violations.find(v => v.field === 'content_type')).toBeDefined()
  })
})

// ─── status ───────────────────────────────────────────────────────────────────

describe('status validation', () => {
  it('passes for each valid status value', () => {
    for (const s of KNOWN_STATUS_VALUES) {
      const violations = validateContentItem(makeItem({ status: s }), VALID_DENIAL_CODES)
      expect(violations.filter(v => v.field === 'status')).toHaveLength(0)
    }
  })

  it('fails for an unknown status value', () => {
    const violations = validateContentItem(makeItem({ status: 'published' }), VALID_DENIAL_CODES)
    const v = violations.find(v => v.field === 'status')
    expect(v).toBeDefined()
    expect(v!.rule).toBe('unknown_value')
  })

  it('fails for an empty status', () => {
    const violations = validateContentItem(makeItem({ status: '' }), VALID_DENIAL_CODES)
    expect(violations.find(v => v.field === 'status')).toBeDefined()
  })

  it('includes all expected status values in KNOWN_STATUS_VALUES', () => {
    const expected = ['idea', 'queued', 'drafted', 'in_review', 'approved', 'active', 'archived']
    for (const s of expected) {
      expect(KNOWN_STATUS_VALUES.has(s)).toBe(true)
    }
  })
})

// ─── summary (body analog) ────────────────────────────────────────────────────

describe('summary validation (body analog — enforced for content-ready states)', () => {
  const CONTENT_READY_STATES = ['drafted', 'in_review', 'approved', 'active']
  const EARLY_STATES = ['idea', 'queued', 'archived']

  it('does NOT require summary for early-stage items (idea/queued/archived)', () => {
    for (const s of EARLY_STATES) {
      const violations = validateContentItem(makeItem({ status: s, summary: null }), VALID_DENIAL_CODES)
      expect(violations.filter(v => v.field === 'summary')).toHaveLength(0)
    }
  })

  it('passes when summary >= 100 chars for content-ready states', () => {
    const longSummary = 'A'.repeat(100)
    for (const s of CONTENT_READY_STATES) {
      const violations = validateContentItem(makeItem({ status: s, summary: longSummary }), VALID_DENIAL_CODES)
      expect(violations.filter(v => v.field === 'summary')).toHaveLength(0)
    }
  })

  it('fails when summary is null for a drafted item', () => {
    const violations = validateContentItem(makeItem({ status: 'drafted', summary: null }), VALID_DENIAL_CODES)
    const v = violations.find(v => v.field === 'summary')
    expect(v).toBeDefined()
    expect(v!.rule).toBe('min_100_chars_for_content_states')
  })

  it('fails when summary is shorter than 100 chars for an in_review item', () => {
    const violations = validateContentItem(makeItem({ status: 'in_review', summary: 'Too short.' }), VALID_DENIAL_CODES)
    const v = violations.find(v => v.field === 'summary')
    expect(v).toBeDefined()
  })

  it('fails when summary is shorter than 100 chars for an active item', () => {
    const violations = validateContentItem(makeItem({ status: 'active', summary: 'Only 50 chars here which is not enough content.' }), VALID_DENIAL_CODES)
    expect(violations.find(v => v.field === 'summary')).toBeDefined()
  })

  it('passes at exactly 100 chars (boundary)', () => {
    const violations = validateContentItem(
      makeItem({ status: 'drafted', summary: 'B'.repeat(100) }),
      VALID_DENIAL_CODES,
    )
    expect(violations.filter(v => v.field === 'summary')).toHaveLength(0)
  })
})

// ─── denial_code reference ────────────────────────────────────────────────────

describe('denial_code reference validation', () => {
  it('passes when source_asset_type is not denial_code (no check needed)', () => {
    const violations = validateContentItem(
      makeItem({ source_asset_type: 'guide', source_asset_id: null }),
      VALID_DENIAL_CODES,
    )
    expect(violations.filter(v => v.field === 'source_asset_id')).toHaveLength(0)
  })

  it('passes when source_asset_type is denial_code and the code exists', () => {
    const violations = validateContentItem(
      makeItem({ source_asset_type: 'denial_code', source_asset_id: 'CO-4' }),
      VALID_DENIAL_CODES,
    )
    expect(violations.filter(v => v.field === 'source_asset_id')).toHaveLength(0)
  })

  it('passes for a denial code with case-insensitive match (CO-29 vs co-29)', () => {
    const violations = validateContentItem(
      makeItem({ source_asset_type: 'denial_code', source_asset_id: 'co-29' }),
      VALID_DENIAL_CODES,
    )
    expect(violations.filter(v => v.field === 'source_asset_id')).toHaveLength(0)
  })

  it('fails when source_asset_type is denial_code but source_asset_id is null', () => {
    const violations = validateContentItem(
      makeItem({ source_asset_type: 'denial_code', source_asset_id: null }),
      VALID_DENIAL_CODES,
    )
    const v = violations.find(v => v.field === 'source_asset_id')
    expect(v).toBeDefined()
    expect(v!.rule).toBe('denial_code_required_when_source_type_is_denial_code')
  })

  it('fails when source_asset_type is denial_code but the code does not exist in the table', () => {
    const violations = validateContentItem(
      makeItem({ source_asset_type: 'denial_code', source_asset_id: 'CO-999' }),
      VALID_DENIAL_CODES,
    )
    const v = violations.find(v => v.field === 'source_asset_id')
    expect(v).toBeDefined()
    expect(v!.rule).toBe('denial_code_not_found')
  })
})

// ─── Clean row (no violations) ────────────────────────────────────────────────

describe('clean row returns no violations', () => {
  it('returns empty array for a fully valid idea-stage item', () => {
    const violations = validateContentItem(
      makeItem({
        title_working: 'Understanding CO-4 Insurance Denials',
        slug:          'understanding-co-4-insurance-denials',
        content_type:  'article',
        status:        'idea',
        summary:       null,   // not required for idea stage
      }),
      VALID_DENIAL_CODES,
    )
    expect(violations).toHaveLength(0)
  })

  it('returns empty array for a fully valid drafted item with sufficient summary', () => {
    const violations = validateContentItem(
      makeItem({
        title_working:    'How to Appeal a CO-4 Insurance Denial',
        slug:             'how-to-appeal-co-4-insurance-denial',
        content_type:     'guide',
        status:           'drafted',
        summary:          'This comprehensive guide explains how to appeal a CO-4 denial. '.repeat(2),
        source_asset_type: 'denial_code',
        source_asset_id:  'CO-4',
      }),
      VALID_DENIAL_CODES,
    )
    expect(violations).toHaveLength(0)
  })

  it('returns empty array for an active item with all fields valid', () => {
    const violations = validateContentItem(
      makeItem({
        title_working: 'Complete Guide to Insurance Appeals',
        slug:          'complete-guide-insurance-appeals',
        content_type:  'guide',
        status:        'active',
        summary:       'This is a comprehensive guide to insurance appeals. '.repeat(3),
      }),
      VALID_DENIAL_CODES,
    )
    expect(violations).toHaveLength(0)
  })
})

// ─── Multiple violations on one row ───────────────────────────────────────────

describe('multiple violations can be reported for one row', () => {
  it('reports violations for all failing fields simultaneously', () => {
    const violations = validateContentItem(
      makeItem({
        title_working: 'Bad',           // too short
        slug:          'Bad Slug Here', // spaces + uppercase
        content_type:  'unknown_type',  // not in known set
        status:        'published',     // not a real status
        summary:       null,
        // status is 'published' which is unknown — summary check uses status, so no summary check needed
      }),
      VALID_DENIAL_CODES,
    )

    const fields = violations.map(v => v.field)
    expect(fields).toContain('title_working')
    expect(fields).toContain('slug')
    expect(fields).toContain('content_type')
    expect(fields).toContain('status')
    expect(violations.length).toBeGreaterThanOrEqual(4)
  })
})

// ─── SLUG_PATTERN export check ────────────────────────────────────────────────

describe('SLUG_PATTERN', () => {
  it('is a RegExp', () => {
    expect(SLUG_PATTERN).toBeInstanceOf(RegExp)
  })

  it('matches valid slugs', () => {
    const valid = [
      'how-to-appeal',
      'co-4-denial',
      'guide',
      'step-1-of-2',
      'a',
    ]
    for (const s of valid) {
      expect(SLUG_PATTERN.test(s)).toBe(true)
    }
  })

  it('rejects invalid slugs', () => {
    const invalid = [
      'Has Uppercase',
      'has_underscore',
      '-starts-with-hyphen',
      'ends-with-hyphen-',
      '',
      'Has.dot',
    ]
    for (const s of invalid) {
      expect(SLUG_PATTERN.test(s)).toBe(false)
    }
  })
})
