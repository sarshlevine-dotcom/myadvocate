import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { updateReviewDecision } from '@/lib/db/review-queue'
import { updateArtifactReleaseState } from '@/lib/db/artifacts'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin().catch(() => null)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const { action, artifactId, riskReason } = body

  if (action === 'approve') {
    await updateReviewDecision({
      reviewQueueId: id,
      decision: 'approved',
      reviewerId: admin.id,
    })
    await updateArtifactReleaseState(artifactId, 'released')
  } else if (action === 'reject') {
    await updateReviewDecision({
      reviewQueueId: id,
      decision: 'rejected',
      reviewerId: admin.id,
      riskReason: riskReason ?? 'Rejected by founder',
    })
    await updateArtifactReleaseState(artifactId, 'archived')
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
