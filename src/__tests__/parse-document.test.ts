import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}))

// Mock tesseract.js
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    loadLanguage: vi.fn(),
    initialize: vi.fn(),
    recognize: vi.fn().mockResolvedValue({
      data: { text: 'DENIAL CO-4 Member ID: 12345', confidence: 85 },
    }),
    terminate: vi.fn(),
  }),
}))

import { parseDocument } from '@/lib/parse-document'
import pdfParse from 'pdf-parse'

describe('parseDocument', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('parses a PDF and returns confidence score', async () => {
    vi.mocked(pdfParse).mockResolvedValue({
      text: 'DENIAL CODE CO-4\nService inconsistent with patient age\nMember: John Doe',
      numpages: 1,
    } as any)

    const result = await parseDocument(Buffer.from('fake-pdf'), 'pdf')
    expect(result.rawText).toContain('DENIAL CODE CO-4')
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('returns confidence 0 on parse failure', async () => {
    vi.mocked(pdfParse).mockRejectedValue(new Error('Invalid PDF'))

    const result = await parseDocument(Buffer.from('bad-data'), 'pdf')
    expect(result.confidence).toBe(0)
    expect(result.rawText).toBe('')
  })

  it('flags low confidence documents below threshold', async () => {
    vi.mocked(pdfParse).mockResolvedValue({
      text: 'a',  // minimal text = low confidence
      numpages: 1,
    } as any)

    const result = await parseDocument(Buffer.from('fake-pdf'), 'pdf')
    expect(result.flaggedForReview).toBe(result.confidence < 0.7)
  })

  it('rejects unsupported file types', async () => {
    await expect(parseDocument(Buffer.from('data'), 'docx' as any))
      .rejects.toThrow('Unsupported file type')
  })
})
