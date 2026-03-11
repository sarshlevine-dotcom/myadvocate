import { NextRequest, NextResponse } from 'next/server'
import { getDenialCodeByCode } from '@/lib/db/denial-codes'
import { logEvent } from '@/lib/db/metric-events'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const result = await getDenialCodeByCode(code)
  if (!result) return NextResponse.json({ error: 'Code not found' }, { status: 404 })

  // Telemetry — NO PII (MA-SEC-002 P13)
  await logEvent({
    eventType: 'tool_use',
    sourcePage: '/tools/denial-decoder',
    toolName: 'denial_decoder',
  }).catch(() => {}) // non-blocking

  return NextResponse.json(result)
}
