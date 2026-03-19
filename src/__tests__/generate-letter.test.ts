import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/rate-limit', () => ({
  generateRateLimit: {
    limit: vi.fn().mockResolvedValue({ success: true, remaining: 9 }),
  },
}))

vi.mock('@/lib/budget-monitor', () => ({
  recordApiSpend: vi.fn().mockResolvedValue('ok'),
}))

// vi.hoisted ensures mockCreate is available when vi.mock factory runs (hoisted scope)
const mockCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Dear Insurance Company, I am writing to appeal...' }],
    usage: { input_tokens: 120, output_tokens: 80 },
  })
)

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockCreate } }
  }),
}))

vi.mock('@/lib/db/artifacts',     () => ({ createArtifact:   vi.fn().mockResolvedValue({ id: 'art-1' }) }))
vi.mock('@/lib/db/review-queue',  () => ({ addToReviewQueue: vi.fn(), insertReviewQueueItem: vi.fn() }))
vi.mock('@/lib/db/metric-events', () => ({ logEvent:         vi.fn().mockResolvedValue(undefined) }))
// Gate 5 — LQE always passes so legacy tests are unaffected
vi.mock('@/lib/lqe', () => ({
  runLQE: vi.fn().mockResolvedValue({
    passed: true,
    checks: {
      denialCodeAccuracy: { passed: true, score: 1.0 },
      ymylSafety:         { passed: true, score: 1.0 },
      legalFraming:       { passed: true, score: 1.0 },
    },
  }),
}))

import { generateLetter } from '@/lib/generate-letter'
import { recordApiSpend }  from '@/lib/budget-monitor'
import { logEvent }        from '@/lib/db/metric-events'

const BASE_PARAMS = {
  caseId:    'case-1',
  userId:    'user-1',
  letterType: 'denial_appeal' as const,
  caseData:  { issueType: 'denial', state: 'CA', denialCode: 'CO-4' },
}

describe('generateLetter', () => {
  beforeEach(() => {
    mockCreate.mockClear()
    vi.mocked(recordApiSpend).mockClear()
    vi.mocked(logEvent).mockClear()
  })

  it('returns an artifact with id', async () => {
    const artifact = await generateLetter(BASE_PARAMS)
    expect(artifact.id).toBe('art-1')
  })

  it('strips PII before calling Anthropic', async () => {
    await generateLetter({
      ...BASE_PARAMS,
      caseData: { issueType: 'denial', state: 'CA', denialCode: 'CO-4', name: 'Jane Doe', ssn: '123-45-6789' },
    })
    const callArg = mockCreate.mock.calls[0]?.[0]
    const prompt  = JSON.stringify(callArg)
    expect(prompt).not.toContain('Jane Doe')
    expect(prompt).not.toContain('123-45-6789')
  })

  // MA-COST-001: Model routing tests
  describe('model routing', () => {
    it('uses haiku by default for denial_appeal', async () => {
      await generateLetter(BASE_PARAMS)
      const callArg = mockCreate.mock.calls[0]?.[0]
      expect(callArg.model).toBe('claude-haiku-4-5-20251001')
    })

    it('upgrades to sonnet when hasDocument=true for denial_appeal', async () => {
      await generateLetter({ ...BASE_PARAMS, hasDocument: true })
      const callArg = mockCreate.mock.calls[0]?.[0]
      expect(callArg.model).toBe('claude-sonnet-4-6')
    })

    it('stays on haiku for hipaa_request even with a document', async () => {
      await generateLetter({ ...BASE_PARAMS, letterType: 'hipaa_request', hasDocument: true })
      const callArg = mockCreate.mock.calls[0]?.[0]
      expect(callArg.model).toBe('claude-haiku-4-5-20251001')
    })

    it('stays on haiku for negotiation_script even with a document', async () => {
      await generateLetter({ ...BASE_PARAMS, letterType: 'negotiation_script', hasDocument: true })
      const callArg = mockCreate.mock.calls[0]?.[0]
      expect(callArg.model).toBe('claude-haiku-4-5-20251001')
    })
  })

  // MA-COST-001: Output cap tests
  describe('output caps', () => {
    it('caps denial_appeal at 600 tokens', async () => {
      await generateLetter(BASE_PARAMS)
      const callArg = mockCreate.mock.calls[0]?.[0]
      expect(callArg.max_tokens).toBe(600)
    })

    it('caps negotiation_script at 200 tokens', async () => {
      await generateLetter({ ...BASE_PARAMS, letterType: 'negotiation_script' })
      const callArg = mockCreate.mock.calls[0]?.[0]
      expect(callArg.max_tokens).toBe(200)
    })
  })

  // MA-COST-001: Cost telemetry tests
  describe('cost telemetry', () => {
    it('calls recordApiSpend with token counts and model tier', async () => {
      await generateLetter(BASE_PARAMS)
      expect(recordApiSpend).toHaveBeenCalledWith(
        expect.objectContaining({
          inputTokens:  120,
          outputTokens: 80,
          modelTier:    'haiku',
          letterType:   'denial_appeal',
        }),
      )
    })

    it('logs letter_generated event with model and token fields', async () => {
      await generateLetter(BASE_PARAMS)
      expect(logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType:    'letter_generated',
          modelUsed:    'haiku',
          inputTokens:  120,
          outputTokens: 80,
        }),
      )
    })
  })
})
