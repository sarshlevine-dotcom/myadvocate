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

/**
 * Expected magic bytes (file signatures) for each allowed MIME type.
 * Used to detect files whose content does not match their declared type.
 */
const MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],             // %PDF
  'image/jpeg':      [0xFF, 0xD8, 0xFF],                    // JPEG/JFIF/EXIF
  'image/png':       [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
}

async function hasMagicBytes(file: File): Promise<boolean> {
  const expected = MAGIC_BYTES[file.type]
  if (!expected) return false
  const slice = await file.slice(0, expected.length).arrayBuffer()
  const actual = new Uint8Array(slice)
  return expected.every((byte, i) => actual[i] === byte)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const caseId = formData.get('caseId') as string | null

  if (!file || !caseId) {
    return NextResponse.json(
      { error: 'file and caseId are required', code: 'MISSING_FIELDS' },
      { status: 400 },
    )
  }

  // Validate file type (P10)
  const fileType = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]
  if (!fileType) {
    return NextResponse.json(
      { error: 'Only PDF, JPG, and PNG files are accepted', code: 'UNSUPPORTED_TYPE' },
      { status: 415 },
    )
  }

  // Validate file size
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File too large (max 10MB)', code: 'FILE_TOO_LARGE' },
      { status: 413 },
    )
  }

  // Reject empty files
  if (file.size === 0) {
    return NextResponse.json(
      { error: 'File is empty', code: 'EMPTY_FILE' },
      { status: 400 },
    )
  }

  // Validate magic bytes — detect renamed/mismatched files
  const magicMatch = await hasMagicBytes(file)
  if (!magicMatch) {
    return NextResponse.json(
      { error: 'File content does not match declared type', code: 'TYPE_MISMATCH' },
      { status: 415 },
    )
  }

  // Verify case belongs to user
  const caseRecord = await getCaseById(caseId)
  if (!caseRecord || caseRecord.user_id !== user.id) {
    return NextResponse.json({ error: 'Case not found', code: 'NOT_FOUND' }, { status: 404 })
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
