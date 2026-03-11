import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures mockCreate is available when vi.mock factory runs (hoisted scope)
const mockCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Dear Insurance Company, I am writing to appeal...' }],
  })
)

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockCreate } }
  }),
}))

vi.mock('@/lib/db/artifacts', () => ({ createArtifact: vi.fn().mockResolvedValue({ id: 'art-1' }) }))
vi.mock('@/lib/db/review-queue', () => ({ addToReviewQueue: vi.fn() }))

import { generateLetter } from '@/lib/generate-letter'

describe('generateLetter', () => {
  beforeEach(() => { mockCreate.mockClear() })

  it('returns an artifact with id', async () => {
    const artifact = await generateLetter({
      caseId: 'case-1',
      userId: 'user-1',
      letterType: 'denial_appeal',
      caseData: { issueType: 'denial', state: 'CA', denialCode: 'CO-4', name: 'Jane Doe', memberId: 'ABC123' },
    })
    expect(artifact.id).toBe('art-1')
  })

  it('strips PII before calling Anthropic', async () => {
    await generateLetter({
      caseId: 'case-1',
      userId: 'user-1',
      letterType: 'denial_appeal',
      caseData: { issueType: 'denial', state: 'CA', denialCode: 'CO-4', name: 'Jane Doe', ssn: '123-45-6789' },
    })
    const callArg = mockCreate.mock.calls[0]?.[0]
    const prompt = JSON.stringify(callArg)
    expect(prompt).not.toContain('Jane Doe')
    expect(prompt).not.toContain('123-45-6789')
  })
})
