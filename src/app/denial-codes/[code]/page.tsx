import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { WithContext, FAQPage } from 'schema-dts'
import { getDenialCodeByCode } from '@/lib/db/denial-codes'
import { createServiceRoleClient } from '@/lib/supabase/server'

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

// ─── SSG — one page per denial code, built at compile time ───────────────────

export async function generateStaticParams() {
  // Must use service role client here — cookies() is not available at build time
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('denial_codes').select('code').order('code')
  return (data ?? []).map((row: { code: string }) => ({ code: row.code.toLowerCase() }))
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ code: string }> },
): Promise<Metadata> {
  const { code: codeParam } = await params
  const record = await getDenialCodeByCode(codeParam.toUpperCase())
  if (!record) return { title: 'Denial Code Not Found | MyAdvocate' }

  return {
    title: `${record.code} Denial Code — ${record.plain_language_explanation} | MyAdvocate`,
    description: `Learn what ${record.code} means, why insurers use it, and how to appeal. ${record.recommended_action}`,
    alternates: {
      canonical: `/denial-codes/${codeParam.toLowerCase()}`,
    },
  }
}

// ─── Page component ───────────────────────────────────────────────────────────

export default async function DenialCodePage(
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: codeParam } = await params
  const record = await getDenialCodeByCode(codeParam.toUpperCase())
  if (!record) notFound()

  const categoryLabel = CATEGORY_LABELS[record.category] ?? record.category

  // FAQ schema — two questions minimum per spec
  const jsonLd: WithContext<FAQPage> = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What does denial code ${record.code} mean?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: record.plain_language_explanation,
        },
      },
      {
        '@type': 'Question',
        name: `How do I appeal a ${record.code} denial?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: record.recommended_action,
        },
      },
      ...(record.common_causes
        ? [{
            '@type': 'Question' as const,
            name: `What are common causes of a ${record.code} denial?`,
            acceptedAnswer: {
              '@type': 'Answer' as const,
              text: record.common_causes,
            },
          }]
        : []),
    ],
  }

  // Related codes — hardwired at build time from denial_codes.related_codes (invariant #11)
  const relatedCodes: string[] = record.related_codes ?? []

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      {/* Structured data — JSON.stringify output is safe; no user content */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
        <Link href="/denial-codes" className="hover:underline">Denial Codes</Link>
        <span className="mx-2">&#x203A;</span>
        <span>{record.code}</span>
      </nav>

      {/* Header */}
      <span className="inline-block text-xs font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 px-2 py-1 rounded mb-3">
        {categoryLabel}
      </span>
      <h1 className="text-3xl font-bold mb-3">Denial Code {record.code}</h1>
      <p className="text-lg text-gray-700 mb-8">{record.plain_language_explanation}</p>

      {/* What to do */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">What To Do</h2>
        <p className="text-gray-800">{record.recommended_action}</p>
      </section>

      {/* Common causes */}
      {record.common_causes && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Common Causes</h2>
          <p className="text-gray-800">{record.common_causes}</p>
        </section>
      )}

      {/* Appeal angle */}
      {record.appeal_angle && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Appeal Strategy</h2>
          <p className="text-gray-800">{record.appeal_angle}</p>
        </section>
      )}

      {/* Related codes — internal linking hardwired at build time (invariant #11) */}
      {relatedCodes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Related Denial Codes</h2>
          <ul className="flex flex-wrap gap-2">
            {relatedCodes.map(related => (
              <li key={related}>
                <Link
                  href={`/denial-codes/${related.toLowerCase()}`}
                  className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium px-3 py-1.5 rounded-lg"
                >
                  {related}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CTA */}
      <div className="border-t border-gray-200 pt-8 mt-8 space-y-4">
        <p className="text-gray-700">
          Ready to fight this denial? We&apos;ll help you write a professional appeal letter in minutes.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/auth?source=denial_code_page&code=${record.code}`}
            className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm"
          >
            Start Your Appeal &#x2192;
          </Link>
          <Link
            href="/tools/denial-decoder"
            className="inline-block border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm"
          >
            Look Up Another Code
          </Link>
        </div>
      </div>
    </main>
  )
}
