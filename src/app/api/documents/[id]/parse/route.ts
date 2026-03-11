import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getDocumentById, updateDocumentParseStatus } from '@/lib/db/documents'
import { createExtractionOutput } from '@/lib/db/extraction-outputs'
import { getCaseById } from '@/lib/db/cases'
import { createClient } from '@/lib/supabase/server'
import { parseDocument } from '@/lib/parse-document'
import { scrubPII } from '@/lib/pii-scrubber'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const document = await getDocumentById(id)
  if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify ownership via case
  const caseRecord = await getCaseById(document.case_id)
  if (!caseRecord || caseRecord.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Download file from private storage
  const supabase = await createClient()
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('documents')
    .download(document.storage_path)
  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'File download failed' }, { status: 500 })
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())

  // Parse document
  const parseResult = await parseDocument(
    buffer,
    document.file_type as 'pdf' | 'jpg' | 'png'
  )

  // Update DOCUMENT parse status
  await updateDocumentParseStatus(
    document.id,
    parseResult.confidence > 0 ? 'parsed' : 'failed',
    parseResult.confidence
  )

  // Scrub PII from raw text before storing (MA-SEC-002 P2)
  const rawPayload: Record<string, unknown> = {
    rawText: parseResult.rawText.slice(0, 5000), // cap stored text
    confidence: parseResult.confidence,
    fileType: document.file_type,
  }
  const scrubbedPayload = scrubPII(rawPayload)

  // Create EXTRACTION_OUTPUT with denormalized user_id for RLS
  await createExtractionOutput({
    documentId: document.id,
    caseId: document.case_id,
    userId: user.id,
    confidenceScore: parseResult.confidence,
    scrubbedPayload,
    flaggedForReview: parseResult.flaggedForReview,
  })

  return NextResponse.json({
    parseStatus: parseResult.confidence > 0 ? 'parsed' : 'failed',
    confidence: parseResult.confidence,
    flaggedForReview: parseResult.flaggedForReview,
  })
}
