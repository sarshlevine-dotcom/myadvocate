import { describe, it, expect } from 'vitest'
import { appendDisclaimer, DISCLAIMERS } from '@/lib/disclaimer'

describe('appendDisclaimer', () => {
  it('appends disclaimer to letter content', () => {
    const result = appendDisclaimer('Letter content here.')
    expect(result).toContain('Letter content here.')
    expect(result).toContain(DISCLAIMERS['1.0.0'])
  })

  it('disclaimer is always at the end', () => {
    const result = appendDisclaimer('Some letter.')
    const disclaimerIndex = result.indexOf(DISCLAIMERS['1.0.0'])
    const contentIndex = result.indexOf('Some letter.')
    expect(disclaimerIndex).toBeGreaterThan(contentIndex)
  })

  it('disclaimer cannot be omitted', () => {
    const result = appendDisclaimer('')
    expect(result).toContain(DISCLAIMERS['1.0.0'])
  })
})
