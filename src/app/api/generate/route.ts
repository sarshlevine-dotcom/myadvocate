import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateLetter, LetterType } from '@/lib/generate-letter'
import { getCaseById } from '@/lib/db/cases'
import { createClient } from '@/lib/supabase/server'
import { generateRateLimit } from '@/lib/rate-limit'
import { writeFrictionEvent } from '@/lib/db/friction-events'

const ALLOWED_LETTER_TYPES: LetterType[] = [
  'denial_appeal',
  'bill_dispute',
  'hipaa_request',
  'negotiation_script',
]

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Subscription check — only active subscribers can generate letters
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.subscription_status !== 'active') {
    return NextResponse.json(
      { error: 'Active subscription required' },
      { status: 402 }
    )
  }

  const { success, remaining } = await generateRateLimit.limit(user.id)
  if (!success) {
    return NextResponse.json(
      { error: 'Daily limit reached. Try again tomorrow.' },
      {
        status: 429,
        headers: { 'X-RateLimit-Remaining': String(remaining) },
      }
    )
  }

  const { caseId, caseData, letterType: rawLetterType } = await request.json()
  const letterType: LetterType = ALLOWED_LETTER_TYPES.includes(rawLetterType)
    ? rawLetterType
    : 'denial_appeal'

  const caseRecord = await getCaseById(caseId)
  if (!caseRecord || caseRecord.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const artifact = await generateLetter({
    caseId,
    userId: user.id,
    letterType,
    caseData,
  })

  // MA-COST-001: Bucket 1 — friction event write, no AI call
  // Fire-and-forget — never block the HTTP response
  if (letterType === 'denial_appeal') {
    writeFrictionEvent({
      tool_used: 'appeal_letter',
      denial_code:     typeof caseData?.denial_code     === 'string' ? caseData.denial_code     : undefined,
      procedure_type:  typeof caseData?.procedure_type  === 'string' ? caseData.procedure_type  : undefined,
      insurer:         typeof caseData?.insurer         === 'string' ? caseData.insurer         : undefined,
      state:           typeof caseData?.state           === 'string' ? caseData.state           : undefined,
      claim_amount_range: null, // Phase 2 optional selector — nurse co-founder approval required
    }).catch(() => {})
  } else if (letterType === 'bill_dispute') {
    writeFrictionEvent({
      tool_used: 'bill_dispute',
      billing_error_type:  typeof caseData?.billing_error_type  === 'string' ? caseData.billing_error_type  : undefined,
      provider_category:   typeof caseData?.provider_category   === 'string' ? caseData.provider_category   : undefined,
      charge_amount_range: typeof caseData?.charge_amount_range === 'string' ? caseData.charge_amount_range : undefined,
      state:               typeof caseData?.state               === 'string' ? caseData.state               : undefined,
    }).catch(() => {})
  }

  return NextResponse.json({ artifactId: artifact.id }, { status: 201 })
}
