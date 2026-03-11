import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateLetter } from '@/lib/generate-letter'
import { getCaseById } from '@/lib/db/cases'
import { createClient } from '@/lib/supabase/server'

// Placeholder rate limit: max 5 requests per user per session (MA-SEC-002 P15 — full impl in Task 24)
const requestCounts = new Map<string, number>()

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

  // Placeholder rate limit
  const count = requestCounts.get(user.id) ?? 0
  if (count >= 5) return NextResponse.json({ error: 'Rate limit reached' }, { status: 429 })
  requestCounts.set(user.id, count + 1)

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
