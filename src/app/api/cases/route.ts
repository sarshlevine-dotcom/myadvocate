import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createCase } from '@/lib/db/cases'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

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
