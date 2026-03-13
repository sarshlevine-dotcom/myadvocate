'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const ISSUE_TYPES = [
  { value: 'denial', label: 'Insurance Denial' },
  { value: 'billing', label: 'Medical Bill Dispute' },
  { value: 'access', label: 'Access to Care' },
]
const STATES = [
  { value: 'CA', label: 'California' },
  { value: 'TX', label: 'Texas' },
  { value: 'NY', label: 'New York' },
]

function IntakeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Pre-fill denial type if arriving from Denial Decoder conversion flow
  const [issueType, setIssueType] = useState(
    () => searchParams.get('source') === 'denial_decoder' ? 'denial' : ''
  )
  const [state, setState] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueType,
          state,
          entrySource: searchParams.get('source') === 'denial_decoder' ? 'denial_decoder' : 'direct',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/cases/${data.id}`)
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">Tell us about your situation</h1>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-medium mb-2">What type of issue?</label>
          <select value={issueType} onChange={e => setIssueType(e.target.value)} required
            className="w-full border rounded-lg px-4 py-3">
            <option value="">Select...</option>
            {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-medium mb-2">Which state?</label>
          <select value={state} onChange={e => setState(e.target.value)} required
            className="w-full border rounded-lg px-4 py-3">
            <option value="">Select...</option>
            {STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50">
          {loading ? 'Creating...' : 'Continue →'}
        </button>
      </form>
    </main>
  )
}

export default function IntakePage() {
  return (
    <Suspense fallback={<main className="max-w-xl mx-auto px-4 py-12"><p>Loading...</p></main>}>
      <IntakeForm />
    </Suspense>
  )
}
