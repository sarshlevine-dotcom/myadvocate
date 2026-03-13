'use client'

import { useState } from 'react'
import { Input } from './Input'
import { Button } from './Button'
import { Alert } from './Alert'

type State = 'idle' | 'submitting' | 'success' | 'error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function NewsletterCapture() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) return
    setState('submitting')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      setState(res.ok ? 'success' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return <Alert variant="success">You&apos;re on the list!</Alert>
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {state === 'error' && (
        <Alert variant="error">Something went wrong. Try again.</Alert>
      )}
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="your@email.com"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === 'submitting'}
          required
        />
        <Button
          type="submit"
          loading={state === 'submitting'}
          disabled={!EMAIL_RE.test(email.trim())}
        >
          Subscribe
        </Button>
      </div>
    </form>
  )
}
