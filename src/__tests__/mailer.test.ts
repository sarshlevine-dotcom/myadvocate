// src/__tests__/mailer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so these refs are available inside the vi.mock factory
const { mockSendMail, mockCreateTransport } = vi.hoisted(() => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
  const mockCreateTransport = vi.fn().mockReturnValue({ sendMail: mockSendMail })
  return { mockSendMail, mockCreateTransport }
})

// Mock nodemailer before importing mailer
vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
}))

// Set required env vars
vi.stubEnv('SMTP_HOST', 'smtp.gmail.com')
vi.stubEnv('SMTP_PORT', '587')
vi.stubEnv('SMTP_USER', 'admin@getmyadvocate.org')
vi.stubEnv('SMTP_PASS', 'test-pass')
vi.stubEnv('KATE_EMAIL', 'kate@example.com')
vi.stubEnv('SARSH_EMAIL', 'sarsh@example.com')

import { sendReviewNotification, sendCapacityAlert } from '@/lib/mailer'

const MOCK_ARTIFACT = {
  id: 'art-123',
  artifact_type: 'denial_appeal',
  user_id: 'user-abc',
  created_at: '2026-03-13T12:00:00Z',
  release_state: 'review_required',
}

describe('sendReviewNotification', () => {
  beforeEach(() => mockSendMail.mockClear())

  it('sends email to both Kate and Sarsh', async () => {
    await sendReviewNotification(MOCK_ARTIFACT)
    expect(mockSendMail).toHaveBeenCalledTimes(1)
    const call = mockSendMail.mock.calls[0][0]
    expect(call.to).toContain('kate@example.com')
    expect(call.to).toContain('sarsh@example.com')
  })

  it('includes the letter type in the subject', async () => {
    await sendReviewNotification(MOCK_ARTIFACT)
    const call = mockSendMail.mock.calls[0][0]
    expect(call.subject).toContain('denial_appeal')
    expect(call.subject).toContain('[MyAdvocate]')
  })

  it('includes artifact id and user id in body (no PII)', async () => {
    await sendReviewNotification(MOCK_ARTIFACT)
    const call = mockSendMail.mock.calls[0][0]
    const body = call.text ?? call.html ?? ''
    expect(body).toContain('art-123')
    expect(body).toContain('user-abc')
  })

  it('does not throw on sendMail failure — resolves false', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP down'))
    await expect(sendReviewNotification(MOCK_ARTIFACT)).resolves.toBe(false)
  })
})

describe('sendCapacityAlert', () => {
  beforeEach(() => mockSendMail.mockClear())

  it('sends email only to Sarsh (not Kate)', async () => {
    await sendCapacityAlert()
    const call = mockSendMail.mock.calls[0][0]
    expect(call.to).not.toContain('kate@example.com')
    expect(call.to).toContain('sarsh@example.com')
  })

  it('includes ALERT and capacity in subject', async () => {
    await sendCapacityAlert()
    const call = mockSendMail.mock.calls[0][0]
    expect(call.subject).toContain('ALERT')
    expect(call.subject).toContain('capacity')
  })

  it('does not throw on sendMail failure — resolves false', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP down'))
    await expect(sendCapacityAlert()).resolves.toBe(false)
  })
})
