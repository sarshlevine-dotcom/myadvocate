/**
 * Tests for disclaimer.ts constants and getDisclaimerVersion()
 * MA-AUT-006 §G6 — Gate 6 disclaimer version check
 * MA-SEC-002 P30 — artifact provenance hashing
 */

import { describe, it, expect } from 'vitest'
import {
  CURRENT_DISCLAIMER_VERSION,
  DISCLAIMER_HASH,
  DISCLAIMERS,
  getDisclaimerVersion,
  appendDisclaimer,
} from '@/lib/disclaimer'
import { createHash } from 'crypto'

describe('CURRENT_DISCLAIMER_VERSION', () => {
  it('is semver format (x.y.z)', () => {
    expect(CURRENT_DISCLAIMER_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('is a non-empty string', () => {
    expect(CURRENT_DISCLAIMER_VERSION).toBeTruthy()
  })
})

describe('DISCLAIMER_HASH', () => {
  it('is a 12-char hex string', () => {
    expect(DISCLAIMER_HASH).toMatch(/^[0-9a-f]{12}$/)
  })

  it('matches SHA-256 of the current disclaimer text body', () => {
    const expected = createHash('sha256')
      .update(DISCLAIMERS[CURRENT_DISCLAIMER_VERSION])
      .digest('hex')
      .slice(0, 12)
    expect(DISCLAIMER_HASH).toBe(expected)
  })
})

describe('getDisclaimerVersion()', () => {
  it('returns an object with non-empty version and hash strings', () => {
    const result = getDisclaimerVersion()
    expect(result.version).toBeTruthy()
    expect(result.hash).toBeTruthy()
  })

  it('version matches CURRENT_DISCLAIMER_VERSION', () => {
    const result = getDisclaimerVersion()
    expect(result.version).toBe(CURRENT_DISCLAIMER_VERSION)
  })

  it('hash matches DISCLAIMER_HASH', () => {
    const result = getDisclaimerVersion()
    expect(result.hash).toBe(DISCLAIMER_HASH)
  })

  it('is a pure function — repeated calls return identical values', () => {
    const a = getDisclaimerVersion()
    const b = getDisclaimerVersion()
    expect(a).toEqual(b)
  })

  it('does not mutate DISCLAIMERS map', () => {
    const keysBefore = Object.keys(DISCLAIMERS)
    getDisclaimerVersion()
    const keysAfter = Object.keys(DISCLAIMERS)
    expect(keysAfter).toEqual(keysBefore)
  })
})

describe('appendDisclaimer() — unchanged by getDisclaimerVersion', () => {
  it('still appends disclaimer text correctly after getDisclaimerVersion is called', () => {
    getDisclaimerVersion()
    const result = appendDisclaimer('Letter content here.')
    expect(result).toContain('Letter content here.')
    expect(result).toContain('IMPORTANT DISCLAIMER')
  })
})
