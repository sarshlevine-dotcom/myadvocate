import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createCase } from '@/lib/db/cases'
import type { IssueType, UsState } from '@/types/domain'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { issueType, state, entrySource } = body

  // Validate bounded fields — no freeform (MA-SEC-002 P1)
  const validIssueTypes: IssueType[] = ['denial', 'billing', 'access']
  const validStates: UsState[] = ['CA', 'TX', 'NY']
  if (!validIssueTypes.includes(issueType)) return NextResponse.json({ error: 'Invalid issue type' }, { status: 400 })
  if (!validStates.includes(state)) return NextResponse.json({ error: 'Invalid state' }, { status: 400 })

  const caseRecord = await createCase({ userId: user.id, issueType, state, entrySource: entrySource ?? 'direct' })
  return NextResponse.json(caseRecord, { status: 201 })
}
