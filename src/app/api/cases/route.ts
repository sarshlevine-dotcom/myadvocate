import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createCase } from '@/lib/db/cases'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { IssueType, UsState } from '@/types/domain'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { issueType, state, entrySource } = body

    // Validate bounded fields — no freeform (MA-SEC-002 P1)
    const validIssueTypes: IssueType[] = ['denial', 'billing', 'access']
    const validStates: UsState[] = ['CA', 'TX', 'NY']
    if (!validIssueTypes.includes(issueType)) return NextResponse.json({ error: 'Invalid issue type' }, { status: 400 })
    if (!validStates.includes(state)) return NextResponse.json({ error: 'Invalid state' }, { status: 400 })

    // Guard: ensure public.users row exists for this auth user.
    // The handle_new_user trigger creates it on signup, but may not fire if
    // the user authenticated before migrations were applied in production.
    const supabase = createServiceRoleClient()
    const { data: existingUser, error: selectErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (selectErr && selectErr.code !== 'PGRST116') {
      // Real DB error — not just "row not found"
      console.error('[api/cases] Failed to check users row:', selectErr)
      return NextResponse.json({ error: 'Failed to create case. Please try again.' }, { status: 500 })
    }

    if (!existingUser) {
      // User authenticated but public.users row missing — create it now.
      const { error: insertErr } = await supabase
        .from('users')
        .insert({ id: user.id, email: user.email ?? '' })
      if (insertErr) {
        console.error('[api/cases] Failed to backfill users row:', insertErr)
        return NextResponse.json({ error: 'Account setup incomplete. Please try again.' }, { status: 500 })
      }
    }

    const caseRecord = await createCase({ userId: user.id, issueType, state, entrySource: entrySource ?? 'direct' })
    return NextResponse.json(caseRecord, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/cases] Unhandled error:', message)
    return NextResponse.json({ error: 'Failed to create case. Please try again.' }, { status: 500 })
  }
}
