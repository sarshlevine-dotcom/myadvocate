import { describe, it, expect } from 'vitest'
import { scrubPII } from '@/lib/pii-scrubber'

describe('scrubPII', () => {
  it('removes full name', () => {
    const result = scrubPII({ name: 'Jane Doe', issueType: 'denial' })
    expect(result).not.toHaveProperty('name')
    expect(result.issueType).toBe('denial')
  })

  it('removes DOB', () => {
    const result = scrubPII({ dob: '1990-01-01', state: 'CA' })
    expect(result).not.toHaveProperty('dob')
  })

  it('removes SSN', () => {
    const result = scrubPII({ ssn: '123-45-6789', issueType: 'billing' })
    expect(result).not.toHaveProperty('ssn')
  })

  it('removes member ID', () => {
    const result = scrubPII({ memberId: 'ABC123456', state: 'TX' })
    expect(result).not.toHaveProperty('memberId')
  })

  it('removes provider name', () => {
    const result = scrubPII({ providerName: 'Dr. Smith', issueType: 'denial' })
    expect(result).not.toHaveProperty('providerName')
  })

  it('removes address fields', () => {
    const result = scrubPII({ address: '123 Main St', city: 'Oakland', state: 'CA' })
    expect(result).not.toHaveProperty('address')
    expect(result).not.toHaveProperty('city')
    expect(result.state).toBe('CA')
  })

  it('preserves non-PII fields', () => {
    const result = scrubPII({ issueType: 'denial', state: 'CA', denialCode: 'CO-4' })
    expect(result).toEqual({ issueType: 'denial', state: 'CA', denialCode: 'CO-4' })
  })
})
