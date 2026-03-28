import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Insurance Denial Codes — Plain-Language Guide | MyAdvocate',
  description:
    'Look up any insurance denial code from your Explanation of Benefits (EOB). Free plain-language explanations and step-by-step appeal guidance for all common denial codes.',
}

const CATEGORY_LABELS: Record<string, string> = {
  medical_necessity: 'Medical Necessity',
  prior_auth:        'Prior Authorization',
  coordination:      'Coordination of Benefits',
  timely_filing:     'Timely Filing',
  billing_error:     'Billing Error',
  coverage:          'Coverage / Network',
  labs:              'Lab Services',
  imaging:           'Imaging',
  surgery:           'Surgery',
  dme:               'Durable Medical Equipment',
  pharmacy:          'Pharmacy',
  mental_health:     'Mental Health',
  other:             'Other',
}

export default async function DenialCodesIndexPage() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('denial_codes').select('*').order('code')
  const codes = data ?? []

  // Group by category — hardwired at build time (invariant #11)
  const grouped = codes.reduce<Record<string, typeof codes>>((acc, row) => {
    const cat = row.category ?? 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(row)
    return acc
  }, {})

  // Sort categories: medical_necessity first, other last
  const CATEGORY_ORDER = [
    'medical_necessity', 'prior_auth', 'coordination', 'timely_filing',
    'billing_error', 'coverage', 'labs', 'imaging', 'surgery',
    'dme', 'pharmacy', 'mental_health', 'other',
  ]
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => (CATEGORY_ORDER.indexOf(a) ?? 99) - (CATEGORY_ORDER.indexOf(b) ?? 99),
  )

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-3">Insurance Denial Codes</h1>
      <p className="text-gray-600 mb-2">
        Fewer than 1% of patients appeal insurance denials — yet 40–60% of those who do, win.
        Find your denial code below to learn what it means and how to fight back.
      </p>
      <p className="mb-8">
        <Link href="/tools/denial-decoder" className="text-blue-600 underline">
          Use the Denial Code Decoder →
        </Link>
      </p>

      {sortedCategories.map(category => (
        <section key={category} className="mb-10">
          <h2 className="text-xl font-semibold mb-3 pb-1 border-b border-gray-200">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <ul className="space-y-2">
            {grouped[category].map(row => (
              <li key={row.code}>
                <Link
                  href={`/denial-codes/${row.code.toLowerCase()}`}
                  className="text-blue-700 hover:underline font-medium"
                >
                  {row.code}
                </Link>
                <span className="text-gray-600 ml-2">— {row.plain_language_explanation}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="mt-10 p-6 bg-blue-50 rounded-xl">
        <h2 className="text-lg font-semibold mb-2">Not sure which code applies?</h2>
        <p className="text-gray-700 mb-4">
          Enter the code from your EOB directly into the Denial Decoder for an instant explanation.
        </p>
        <Link
          href="/tools/denial-decoder"
          className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm"
        >
          Open Denial Decoder →
        </Link>
      </div>
    </main>
  )
}
