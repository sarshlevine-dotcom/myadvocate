// src/lib/mailer.ts
// MA-SEC-002 P27: YMYL review notification mailer.
// All email logic lives here. Never call nodemailer directly from routes.

import nodemailer from 'nodemailer'

// Artifact shape needed by this module — subset of the DB row
export interface ArtifactNotificationPayload {
  id: string
  artifact_type: string
  user_id: string
  created_at: string
  release_state: string
}

function getTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: false,      // STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const FROM = '"MyAdvocate" <admin@getmyadvocate.org>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getmyadvocate.org'

/**
 * Notify Kate + Sarsh of a new artifact pending YMYL review.
 * Returns true on success, false on failure — never throws.
 */
export async function sendReviewNotification(
  artifact: ArtifactNotificationPayload
): Promise<boolean> {
  try {
    const to = [process.env.KATE_EMAIL, process.env.SARSH_EMAIL]
      .filter(Boolean)
      .join(', ')

    if (!to.trim()) {
      console.warn('[mailer] sendReviewNotification: no recipients configured (KATE_EMAIL and SARSH_EMAIL are both unset)')
      return false
    }

    const reviewUrl = `${APP_URL}/admin/review`

    const text = [
      'A new artifact is pending YMYL clinical review.',
      '',
      `Artifact ID:   ${artifact.id}`,
      `Letter type:   ${artifact.artifact_type}`,
      `User ID:       ${artifact.user_id}`,
      `Created at:    ${artifact.created_at}`,
      `Release state: ${artifact.release_state}`,
      '',
      `Review queue:  ${reviewUrl}`,
      '',
      'SLA: 24 hours from generation time.',
    ].join('\n')

    await getTransport().sendMail({
      from:    FROM,
      to,
      subject: `[MyAdvocate] New artifact pending review — ${artifact.artifact_type}`,
      text,
    })
    return true
  } catch (err) {
    console.error('[mailer] sendReviewNotification failed:', err)
    return false
  }
}

/**
 * Alert Sarsh (only) that the review queue has hit the 10-artifact cap.
 * Returns true on success, false on failure — never throws.
 */
export async function sendCapacityAlert(): Promise<boolean> {
  try {
    const to = process.env.SARSH_EMAIL ?? ''

    if (!to.trim()) {
      console.warn('[mailer] sendCapacityAlert: no recipient configured (SARSH_EMAIL is unset)')
      return false
    }

    const reviewUrl = `${APP_URL}/admin/review`

    const text = [
      'ALERT: The YMYL review queue has reached capacity (10 pending artifacts).',
      '',
      'New artifact generation is paused until the queue drops below 10.',
      '',
      `Review queue: ${reviewUrl}`,
      '',
      'Action required: approve or reject pending artifacts to resume generation.',
    ].join('\n')

    await getTransport().sendMail({
      from:    FROM,
      to,
      subject: '[MyAdvocate] ALERT: Review queue at capacity — generation paused',
      text,
    })
    return true
  } catch (err) {
    console.error('[mailer] sendCapacityAlert failed:', err)
    return false
  }
}
