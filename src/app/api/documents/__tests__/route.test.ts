/**
 * Tests for POST /api/documents (H1-09 — upload hardening)
 *
 * Covers:
 *   - Missing file or caseId          → 400 MISSING_FIELDS
 *   - Unsupported MIME type           → 415 UNSUPPORTED_TYPE
 *   - File exceeds 10 MB              → 413 FILE_TOO_LARGE
 *   - Empty file (size === 0)         → 400 EMPTY_FILE
 *   - Magic-byte mismatch             → 415 TYPE_MISMATCH
 *   - Valid PDF/JPEG/PNG upload       → 201 { documentId }
 *
 * All external I/O is mocked — no real DB, storage, or auth calls.
 * request.formData() is mocked to avoid jsdom FormData.append compatibility issues.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mockGetCurrentUser  = vi.hoisted(() => vi.fn())
const mockGetCaseById     = vi.hoisted(() => vi.fn())
const mockCreateDocument  = vi.hoisted(() => vi.fn())
const mockStorageUpload   = vi.hoisted(() => vi.fn())
const mockStorageFrom     = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth',         () => ({ getCurrentUser: mockGetCurrentUser }))
vi.mock('@/lib/db/cases',     () => ({ getCaseById: mockGetCaseById }))
vi.mock('@/lib/db/documents', () => ({ createDocument: mockCreateDocument }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    storage: { from: mockStorageFrom },
  }),
}))

// Import route handler after mocks
import { POST } from '@/app/api/documents/route'

// ─── Magic byte constants ─────────────────────────────────────────────────────

const PDF_HEADER  = [0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34] // %PDF-1.4
const JPEG_HEADER = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]
const PNG_HEADER  = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
const EXE_HEADER  = [0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00] // MZ

function makeFileBytes(header: number[], totalSize = 64): Uint8Array {
  const bytes = new Uint8Array(totalSize)
  header.forEach((b, i) => { bytes[i] = b })
  return bytes
}

/**
 * Create a mock File-like object with the specified header bytes and MIME type.
 * We avoid using real `File` objects in `FormData.append()` due to jsdom webidl
 * compatibility issues; instead we return the object directly via the formData mock.
 */
function makeFile(
  header: number[],
  mimeType: string,
  name = 'test.bin',
  totalSize = 64,
): File {
  const bytes = makeFileBytes(header, totalSize)
  return new File([bytes], name, { type: mimeType })
}

function makeEmptyFile(mimeType: string, name = 'empty.pdf'): File {
  return new File([], name, { type: mimeType })
}

/**
 * Build a mock NextRequest whose formData() resolves to the given fields.
 * This bypasses jsdom's FormData.append() webidl File type check.
 */
function makeRequest(file: File | null, caseId: string | null): NextRequest {
  const mockFormData = {
    get: (key: string) => {
      if (key === 'file')   return file
      if (key === 'caseId') return caseId
      return null
    },
  }
  return {
    formData: () => Promise.resolve(mockFormData),
  } as unknown as NextRequest
}

// ─── Default happy-path stubs ─────────────────────────────────────────────────

function stubHappyPath() {
  mockGetCurrentUser.mockResolvedValue({ id: 'user-001' })
  mockGetCaseById.mockResolvedValue({ id: 'case-001', user_id: 'user-001' })
  mockCreateDocument.mockResolvedValue({ id: 'doc-001' })
  mockStorageFrom.mockReturnValue({ upload: mockStorageUpload })
  mockStorageUpload.mockResolvedValue({ error: null })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/documents', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Auth ────────────────────────────────────────────────────────────────────

  it('returns 401 UNAUTHORIZED when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const req = makeRequest(makeFile(PDF_HEADER, 'application/pdf'), 'case-001')
    const res = await POST(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('UNAUTHORIZED')
  })

  // ── Missing fields ──────────────────────────────────────────────────────────

  it('returns 400 MISSING_FIELDS when file is absent', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-001' })
    const req = makeRequest(null, 'case-001')
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('MISSING_FIELDS')
  })

  it('returns 400 MISSING_FIELDS when caseId is absent', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-001' })
    const req = makeRequest(makeFile(PDF_HEADER, 'application/pdf'), null)
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('MISSING_FIELDS')
  })

  // ── Unsupported MIME type ───────────────────────────────────────────────────

  it('returns 415 UNSUPPORTED_TYPE for an unsupported MIME type', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-001' })
    const file = makeFile(EXE_HEADER, 'application/octet-stream', 'virus.exe')
    const req = makeRequest(file, 'case-001')
    const res = await POST(req)

    expect(res.status).toBe(415)
    const body = await res.json()
    expect(body.code).toBe('UNSUPPORTED_TYPE')
  })

  it('returns 415 UNSUPPORTED_TYPE for text/plain', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-001' })
    const file = new File(['hello world'], 'notes.txt', { type: 'text/plain' })
    const req = makeRequest(file, 'case-001')
    const res = await POST(req)

    expect(res.status).toBe(415)
    const body = await res.json()
    expect(body.code).toBe('UNSUPPORTED_TYPE')
  })

  // ── File too large ──────────────────────────────────────────────────────────

  it('returns 413 FILE_TOO_LARGE for a file exceeding 10 MB', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-001' })
    // Create a file object whose .size reports > 10MB without allocating real memory
    const oversizeFile = Object.create(
      File.prototype,
      Object.getOwnPropertyDescriptors(new File([new Uint8Array(8)], 'big.pdf', { type: 'application/pdf' })),
    ) as File
    Object.defineProperty(oversizeFile, 'size', { value: 10 * 1024 * 1024 + 1 })
    const req = makeRequest(oversizeFile, 'case-001')
    const res = await POST(req)

    expect(res.status).toBe(413)
    const body = await res.json()
    expect(body.code).toBe('FILE_TOO_LARGE')
  })

  // ── Empty file ──────────────────────────────────────────────────────────────

  it('returns 400 EMPTY_FILE for a zero-byte file', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-001' })
    const req = makeRequest(makeEmptyFile('application/pdf'), 'case-001')
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('EMPTY_FILE')
  })

  // ── Magic-byte mismatch ─────────────────────────────────────────────────────

  it('returns 415 TYPE_MISMATCH for an EXE file declared as application/pdf', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-001' })
    const file = makeFile(EXE_HEADER, 'application/pdf', 'renamed.pdf')
    const req = makeRequest(file, 'case-001')
    const res = await POST(req)

    expect(res.status).toBe(415)
    const body = await res.json()
    expect(body.code).toBe('TYPE_MISMATCH')
  })

  it('returns 415 TYPE_MISMATCH for an EXE file declared as image/jpeg', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-001' })
    const file = makeFile(EXE_HEADER, 'image/jpeg', 'renamed.jpg')
    const req = makeRequest(file, 'case-001')
    const res = await POST(req)

    expect(res.status).toBe(415)
    const body = await res.json()
    expect(body.code).toBe('TYPE_MISMATCH')
  })

  it('returns 415 TYPE_MISMATCH for an EXE file declared as image/png', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-001' })
    const file = makeFile(EXE_HEADER, 'image/png', 'renamed.png')
    const req = makeRequest(file, 'case-001')
    const res = await POST(req)

    expect(res.status).toBe(415)
    const body = await res.json()
    expect(body.code).toBe('TYPE_MISMATCH')
  })

  // ── Happy paths ─────────────────────────────────────────────────────────────

  it('returns 201 with documentId for a valid PDF upload', async () => {
    stubHappyPath()
    const file = makeFile(PDF_HEADER, 'application/pdf', 'denial.pdf')
    const req = makeRequest(file, 'case-001')
    const res = await POST(req)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.documentId).toBe('doc-001')
  })

  it('returns 201 for a valid JPEG upload', async () => {
    stubHappyPath()
    const file = makeFile(JPEG_HEADER, 'image/jpeg', 'photo.jpg')
    const req = makeRequest(file, 'case-001')
    const res = await POST(req)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.documentId).toBeDefined()
  })

  it('returns 201 for a valid PNG upload', async () => {
    stubHappyPath()
    const file = makeFile(PNG_HEADER, 'image/png', 'scan.png')
    const req = makeRequest(file, 'case-001')
    const res = await POST(req)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.documentId).toBeDefined()
  })
})
