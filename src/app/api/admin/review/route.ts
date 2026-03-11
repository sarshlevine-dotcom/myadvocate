import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getPendingReviews } from '@/lib/db/review-queue'

export async function GET() {
  const admin = await requireAdmin().catch(() => null)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const pending = await getPendingReviews()
  return NextResponse.json(pending)
}
