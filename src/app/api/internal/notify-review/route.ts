// src/app/api/internal/notify-review/route.ts
// MA-SEC-002 P27: Internal route — dispatches YMYL review email notification.
// Called fire-and-forget from the generate route after artifact creation.
// Not user-facing; no auth session required — uses service role key.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendReviewNotification } from '@/lib/mailer'

export async function POST(request: NextRequest) {
  let artifactId: string | undefined
  try {
    const body = await request.json()
    artifactId = body?.artifactId
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!artifactId || typeof artifactId !== 'string') {
    return NextResponse.json({ error: 'artifactId is required' }, { status: 400 })
  }

  // Query artifact — service role bypasses RLS so this works without user session
  const supabase = createServiceRoleClient()
  const { data: artifact, error: dbError } = await supabase
    .from('artifacts')
    .select('id, artifact_type, user_id, created_at, release_state')
    .eq('id', artifactId)
    .single()

  if (dbError) {
    console.error('[notify-review] DB error:', dbError.message)
    return NextResponse.json({ error: 'Failed to query artifact' }, { status: 500 })
  }

  if (!artifact) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
  }

  const ok = await sendReviewNotification(artifact)
  if (!ok) {
    return NextResponse.json({ error: 'Email dispatch failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
