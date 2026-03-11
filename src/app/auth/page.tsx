'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    // Preserve source + code for conversion tracking through magic link
    const redirectTo = new URL('/intake', window.location.origin)
    const source = searchParams.get('source')
    const code = searchParams.get('code')
    if (source) redirectTo.searchParams.set('source', source)
    if (code) redirectTo.searchParams.set('code', code)

    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo.toString() },
    })
    setSent(true)
    setLoading(false)
  }

  if (sent) return (
    <main className="max-w-md mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold mb-4">Check your email</h1>
      <p className="text-gray-600">We sent a sign-in link to <strong>{email}</strong>. Click it to continue.</p>
    </main>
  )

  return (
    <main className="max-w-md mx-auto px-4 py-24">
      <h1 className="text-2xl font-bold mb-2">Create your account</h1>
      <p className="text-gray-600 mb-8">Enter your email. We&apos;ll send you a link to sign in — no password needed.</p>
      <form onSubmit={handleSignIn} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border rounded-lg px-4 py-3"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send sign-in link'}
        </button>
      </form>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<main className="max-w-md mx-auto px-4 py-24"><p>Loading...</p></main>}>
      <AuthForm />
    </Suspense>
  )
}
