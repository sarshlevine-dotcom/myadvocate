import { NextRequest, NextResponse } from 'next/server'
import { getDenialCodeByCode } from '@/lib/db/denial-codes'
import { logEvent } from '@/lib/db/metric-events'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const result = await getDenialCodeByCode(code)
  if (!result) return NextResponse.json({ error: 'Code not found' }, { status: 404 })

  // Resolve the authenticated user (may be null for unauthenticated visitors)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  // Telemetry — NO PII (MA-SEC-002 P13); non-blocking
  logEvent({
    eventType: 'tool_use',
    sourcePage: '/tools/denial-decoder',
    toolName: 'denial_decoder',
    userId,
  }).catch(() => {})

  // PMP v19 §8 metric 2 — second_tool_use: fire if this authenticated user
  // already has a prior tool_use event recorded (count > 0 before this insert)
  if (userId) {
    Promise.resolve(
      supabase
        .from('metric_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('event_type', 'tool_use')
    ).then(({ count }) => {
      if (count && count > 0) {
        logEvent({
          eventType: 'second_tool_use',
          sourcePage: '/tools/denial-decoder',
          toolName: 'denial_decoder',
          userId,
        }).catch(() => {})
      }
    }).catch(() => {})
  }

  return NextResponse.json(result)
}
