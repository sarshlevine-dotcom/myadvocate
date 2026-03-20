// MA-SEC-002: Document parsing — confidence threshold 0.7
// Only PDFs and images accepted

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>
import { createWorker } from 'tesseract.js'

export const CONFIDENCE_THRESHOLD = 0.7

export type ParseResult = {
  rawText: string
  confidence: number       // 0.0 – 1.0
  flaggedForReview: boolean
}

export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  try {
    const data = await pdfParse(buffer)
    const textLength = data.text.trim().length

    // Confidence heuristic: text density relative to expected minimum
    // A useful denial letter typically has at least 500 characters
    const confidence = Math.min(textLength / 500, 1.0)

    return {
      rawText: data.text,
      confidence,
      flaggedForReview: confidence < CONFIDENCE_THRESHOLD,
    }
  } catch {
    return { rawText: '', confidence: 0, flaggedForReview: true }
  }
}

export async function parseImage(buffer: Buffer): Promise<ParseResult> {
  const worker = await createWorker('eng')
  try {
    const { data } = await worker.recognize(buffer)
    // Tesseract returns confidence as 0-100 integer
    const confidence = Math.min((data.confidence ?? 0) / 100, 1.0)
    return {
      rawText: data.text,
      confidence,
      flaggedForReview: confidence < CONFIDENCE_THRESHOLD,
    }
  } finally {
    await worker.terminate()
  }
}

export async function parseDocument(
  buffer: Buffer,
  fileType: 'pdf' | 'jpg' | 'png'
): Promise<ParseResult> {
  if (fileType === 'pdf') return parsePDF(buffer)
  if (fileType === 'jpg' || fileType === 'png') return parseImage(buffer)
  throw new Error(`Unsupported file type: ${fileType}`)
}
