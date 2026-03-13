'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ClaimAmountSelector } from '@/components'

type Step = 'form' | 'generating' | 'result' | 'error'

const INSURERS = [
  'Aetna', 'Anthem / Blue Cross Blue Shield', 'Cigna', 'Humana',
  'Kaiser Permanente', 'UnitedHealthcare', 'Other',
]
const STATES = [
  { value: 'CA', label: 'California' },
  { value: 'TX', label: 'Texas' },
  { value: 'NY', label: 'New York' },
]
const PROCEDURE_TYPES = [
  'Surgery', 'Imaging / MRI / CT', 'Lab Work', 'Mental Health', 'Physical Therapy',
  'Specialist Visit', 'Emergency Care', 'Prescription', 'Other',
]

export default function AppealLetterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [authChecked, setAuthChecked] = useState(false)

  // Form fields
  const [denialCode, setDenialCode]       = useState('')
  const [insurer, setInsurer]             = useState('')
  const [procedureType, setProcedureType] = useState('')
  const [state, setState]                 = useState('')

  // Result
  const [letter, setLetter]   = useState('')
  const [caseId, setCaseId]   = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Auth gate — redirect to /auth if not signed in
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/auth?redirect=/tools/appeal-letter')
      else setAuthChecked(true)
    })
  }, [router])

  if (!authChecked) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-gray-500">Loading...</p>
      </main>
    )
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setStep('generating')
    setErrorMsg('')

    try {
      // Step 1: create a case record
      const caseRes = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueType: 'denial', state, entrySource: 'direct' }),
      })
      if (!caseRes.ok) {
        const err = await caseRes.json()
        if (caseRes.status === 402) {
          setErrorMsg('An active subscription is required to generate letters.')
        } else {
          setErrorMsg(err.error ?? 'Could not create case. Please try again.')
        }
        setStep('error')
        return
      }
      const caseData = await caseRes.json()
      const newCaseId: string = caseData.id

      // Step 2: generate the letter
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: newCaseId,
          letterType: 'denial_appeal',
          caseData: {
            denial_code:    denialCode    || undefined,
            insurer:        insurer       || undefined,
            procedure_type: procedureType || undefined,
            state,
          },
        }),
      })
      if (!genRes.ok) {
        const err = await genRes.json()
        setErrorMsg(err.error ?? 'Letter generation failed. Please try again.')
        setStep('error')
        return
      }
      const { content, caseId: returnedCaseId } = await genRes.json()

      setLetter(content)
      setCaseId(returnedCaseId ?? newCaseId)
      setStep('result')
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setStep('error')
    }
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  if (step === 'form') {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Appeal Letter Generator</h1>
        <p className="text-gray-600 mb-8">
          Tell us about your denial and we&apos;ll write a professional appeal letter for you.
        </p>
        <form onSubmit={handleGenerate} className="space-y-6">
          <div>
            <label className="block font-medium mb-1">
              Denial code <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={denialCode}
              onChange={e => setDenialCode(e.target.value.toUpperCase())}
              placeholder="e.g. CO-4, PR-96"
              className="w-full border rounded-lg px-4 py-3 uppercase"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Insurer</label>
            <select
              value={insurer}
              onChange={e => setInsurer(e.target.value)}
              className="w-full border rounded-lg px-4 py-3"
              required
            >
              <option value="">Select insurer…</option>
              {INSURERS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Type of service denied</label>
            <select
              value={procedureType}
              onChange={e => setProcedureType(e.target.value)}
              className="w-full border rounded-lg px-4 py-3"
              required
            >
              <option value="">Select type…</option>
              {PROCEDURE_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">State</label>
            <select
              value={state}
              onChange={e => setState(e.target.value)}
              className="w-full border rounded-lg px-4 py-3"
              required
            >
              <option value="">Select state…</option>
              {STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Generate Appeal Letter →
          </button>
        </form>
      </main>
    )
  }

  // ── Generating ────────────────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-lg font-medium text-gray-700">Writing your appeal letter…</p>
        <p className="text-gray-500 mt-2 text-sm">This usually takes 5–10 seconds.</p>
      </main>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-red-600 mb-4">{errorMsg}</p>
        <button
          onClick={() => setStep('form')}
          className="border border-blue-600 text-blue-600 px-5 py-2.5 rounded-lg font-medium hover:bg-blue-50"
        >
          ← Try again
        </button>
      </main>
    )
  }

  // ── Result — letter displayed, then ClaimAmountSelector ──────────────────
  // MA-DAT-ENG-P1-006: selector ONLY appears after letter is fully rendered
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Appeal Letter</h1>
        <button
          onClick={() => setStep('form')}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Start over
        </button>
      </div>

      {/* Letter content */}
      <div className="border rounded-xl p-6 bg-white whitespace-pre-wrap font-mono text-sm leading-relaxed">
        {letter}
      </div>

      {/* Copy button */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => navigator.clipboard.writeText(letter)}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          Copy letter
        </button>
      </div>

      {/* MA-DAT-ENG-P1-006: ClaimAmountSelector — post-generation, never blocks letter display */}
      <ClaimAmountSelector caseId={caseId} />
    </main>
  )
}
