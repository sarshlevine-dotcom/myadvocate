'use client'

// MA-DAT-ENG-P1-006: Optional claim_amount_range selector
// MA-COST-001: Bucket 1 — DB write only, no AI call
// Copy approved by Kate (nurse co-founder) 2026-03-13 — DO NOT ALTER
import { useState } from 'react'
import type { ClaimAmountRange } from '@/lib/db/friction-events'

interface ClaimAmountSelectorProps {
  /** caseId from the generate API response — used to update the friction_events record */
  caseId: string
}

const RANGES: { value: ClaimAmountRange; label: string }[] = [
  { value: 'under_500',   label: 'Under $500' },
  { value: '500_2000',    label: '$500 – $2,000' },
  { value: '2000_10000',  label: '$2,000 – $10,000' },
  { value: 'over_10000',  label: 'Over $10,000' },
]

export function ClaimAmountSelector({ caseId }: ClaimAmountSelectorProps) {
  const [done, setDone] = useState(false)

  async function handleSelect(range: ClaimAmountRange | null) {
    // MA-DAT-ENG-P1-006: Clicking Skip stores null — no record is written or updated
    if (range !== null) {
      // MA-COST-001: Bucket 1 — fire-and-forget, never block user flow
      fetch('/api/friction-events/claim-amount', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, claimAmountRange: range }),
      }).catch(() => {})
    }
    setDone(true)
  }

  // One-time prompt — disappears after any selection including Skip
  if (done) return null

  return (
    <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
      {/* Kate-approved copy — DO NOT ALTER */}
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">
        Help future patients like you
      </p>
      <p className="font-medium text-gray-900 mb-4">
        How much is at stake in your dispute? (Optional — takes 5 seconds)
      </p>

      {/* Button group — all options equal visual weight including Skip */}
      <div className="flex flex-wrap gap-3 mb-4">
        {RANGES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleSelect(value)}
            className="min-w-[130px] rounded-lg border border-blue-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-blue-100 active:bg-blue-200 transition-colors"
          >
            {label}
          </button>
        ))}
        {/* Skip — identical styling to range options, not de-emphasized */}
        <button
          onClick={() => handleSelect(null)}
          className="min-w-[130px] rounded-lg border border-blue-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-blue-100 active:bg-blue-200 transition-colors"
        >
          Skip
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Your answer is anonymous and helps us show future patients the real
        financial impact of insurance denials.
      </p>
    </div>
  )
}
