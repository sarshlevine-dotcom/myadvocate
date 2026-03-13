import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase magic-link callback handler.
 *
 * Supabase redirects here after the user clicks the email link.
 * Two flows are supported:
 *   1. PKCE (code flow) — Supabase appends ?code=<auth_code>
 *   2. Legacy token hash  — Supabase appends ?token_hash=<hash>&type=<type>
 *
 * After exchanging for a session we redirect to `next` (defaults to /intake).
 * Source + referral code params are preserved through to the final destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'email' | null

  // Destination after successful auth (default: intake)
  const next = searchParams.get('next') ?? '/intake'

  // Preserve UTM / referral params through to destination
  const forwardParams = new URLSearchParams()
  const source = searchParams.get('source')
  const referralCode = searchParams.get('code_ref') // 'code' is used by Supabase PKCE — use code_ref for referral
  if (source) forwardParams.set('source', source)
  if (referralCode) forwardParams.set('code', referralCode)

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  let sessionError: string | null = null

  if (code) {
    // PKCE flow — exchange authorization code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) sessionError = error.message
  } else if (tokenHash && type) {
    // Legacy email OTP / magic link token hash flow
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) sessionError = error.message
  } else {
    sessionError = 'No auth code or token_hash found in callback URL.'
  }

  if (sessionError) {
    console.error('[auth/callback] Session exchange failed:', sessionError)
    const errorUrl = new URL('/auth', origin)
    errorUrl.searchParams.set('error', 'link_expired')
    return NextResponse.redirect(errorUrl)
  }

  // Success — redirect to destination with any forwarded params
  const destinationUrl = new URL(next, origin)
  forwardParams.forEach((value, key) => destinationUrl.searchParams.set(key, value))

  return NextResponse.redirect(destinationUrl)
}
