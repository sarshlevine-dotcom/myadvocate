import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { updateFrictionEventClaimAmount } from '@/lib/db/friction-events'
import type { ClaimAmountRange } from '@/lib/db/friction-events'

// MA-DAT-ENG-P1-006: ClaimAmountSelector calls this endpoint after user picks a range.
// MA-COST-001: Bucket 1 — DB write only, no AI call.

const VALID_RANGES: ClaimAmountRange[] = ['under_500', '500_2000', '2000_10000', 'over_10000']

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { caseId, claimAmountRange } = await request.json()

  if (!caseId || typeof caseId !== 'string') {
    return NextResponse.json({ error: 'caseId required' }, { status: 400 })
  }

  // Validate range — only allow the four defined buckets (never a precise dollar amount)
  if (claimAmountRange !== null && !VALID_RANGES.includes(claimAmountRange)) {
    return NextResponse.json({ error: 'Invalid claimAmountRange' }, { status: 400 })
  }

  // MA-COST-001: Bucket 1 — fire-and-forget from the perspective of the caller,
  // but we await here so the 200 confirms the write succeeded.
  await updateFrictionEventClaimAmount(caseId, claimAmountRange ?? null)

  return NextResponse.json({ ok: true })
}
