'use client'
import { useState } from 'react'

export default function DenialDecoderPage() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{
    code: string
    plain_language_explanation: string
    recommended_action: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/denial-lookup?code=${encodeURIComponent(code)}`)
      if (!res.ok) { setError('Code not found. Check the code and try again.'); return }
      setResult(await res.json())
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Denial Code Decoder</h1>
      <p className="text-gray-600 mb-8">
        Enter the denial code from your Explanation of Benefits (EOB) to find out what it means and what to do next.
      </p>
      <form onSubmit={handleLookup} className="flex gap-3 mb-8">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. CO-4"
          className="flex-1 border rounded-lg px-4 py-3 text-lg uppercase"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Looking up...' : 'Decode'}
        </button>
      </form>

      {error && <p className="text-red-600 mb-6">{error}</p>}

      {result && (
        <div className="bg-blue-50 rounded-xl p-6 space-y-4">
          <div>
            <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">Code {result.code}</span>
            <h2 className="text-xl font-semibold mt-1">{result.plain_language_explanation}</h2>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-1">Recommended Next Step</h3>
            <p className="text-gray-800">{result.recommended_action}</p>
          </div>
          <div className="pt-4 border-t border-blue-200">
            <p className="text-sm text-gray-600 mb-3">Ready to file an appeal? We&apos;ll help you write a letter.</p>
            <a
              href={`/auth?source=denial_decoder&code=${result.code}`}
              className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm"
            >
              Start Your Appeal →
            </a>
          </div>
        </div>
      )}
    </main>
  )
}
