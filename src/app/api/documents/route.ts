import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCaseById } from '@/lib/db/cases'
import { createDocument } from '@/lib/db/documents'
import { createClient } from '@/lib/supabase/server'

// MA-SEC-002 P10: Allowed file types only
const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
} as const

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const caseId = formData.get('caseId') as string | null

  if (!file || !caseId) {
    return NextResponse.json({ error: 'file and caseId required' }, { status: 400 })
  }

  // Validate file type (P10)
  const fileType = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]
  if (!fileType) {
    return NextResponse.json(
      { error: 'Only PDF, JPG, and PNG files are accepted' },
      { status: 415 }
    )
  }

  // Validate file size
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
  }

  // Verify case belongs to user
  const caseRecord = await getCaseById(caseId)
  if (!caseRecord || caseRecord.user_id !== user.id) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  // Upload to private Supabase Storage (P16)
  const supabase = await createClient()
  const timestamp = Date.now()
  const storagePath = `${user.id}/${caseId}/${timestamp}.${fileType}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    })
  if (uploadError) throw uploadError

  // Create DOCUMENT record
  const document = await createDocument({ caseId, fileType, storagePath })

  return NextResponse.json({ documentId: document.id }, { status: 201 })
}
