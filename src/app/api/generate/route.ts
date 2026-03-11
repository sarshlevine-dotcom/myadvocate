import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateLetter } from '@/lib/generate-letter'
import { getCaseById } from '@/lib/db/cases'
import { createClient } from '@/lib/supabase/server'
import { generateRateLimit } from '@/lib/rate-limit'

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

  const { caseId, caseData } = await request.json()
  const caseRecord = await getCaseById(caseId)
  if (!caseRecord || caseRecord.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const artifact = await generateLetter({
    caseId,
    userId: user.id,
    letterType: 'denial_appeal',
    caseData,
  })

  return NextResponse.json({ artifactId: artifact.id }, { status: 201 })
}
