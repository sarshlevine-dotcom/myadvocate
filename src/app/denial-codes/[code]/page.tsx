export const dynamic = "force-dynamic"

import { getDenialCodeByCode } from '@/lib/db/denial-codes'
import { notFound } from 'next/navigation'
import type { WithContext, FAQPage } from 'schema-dts'


export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const record = await getDenialCodeByCode(code)
  if (!record) return {}
  return {
    title: `Denial Code ${record.code} — What It Means | MyAdvocate`,
    description: record.plain_language_explanation,
  }
}

export default async function DenialCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const record = await getDenialCodeByCode(code)
  if (!record) notFound()

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
        name: `What should I do about denial code ${record.code}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: record.recommended_action,
        },
      },
    ],
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl font-bold mb-2">Denial Code {record.code}</h1>
      <p className="text-lg text-gray-700 mb-6">{record.plain_language_explanation}</p>
      <h2 className="text-xl font-semibold mb-2">What To Do</h2>
      <p className="text-gray-800 mb-8">{record.recommended_action}</p>
      <a href="/tools/denial-decoder" className="text-blue-600 underline mr-6">← Look up another code</a>
      <a
        href={`/auth?source=denial_decoder&code=${record.code}`}
        className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm"
      >
        File an Appeal →
      </a>
    </main>
  )
}
