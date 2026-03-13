import type { Metadata } from 'next'
import { NewsletterCapture } from '@/components'

export const metadata: Metadata = {
  title: 'MyAdvocate — Fight Your Insurance Denial',
  description:
    'Insurance denied your claim? Nearly 1 in 5 claims are denied — but fewer than 1% of patients ever appeal, even though 40–60% who do win. MyAdvocate helps you fight back.',
  alternates: { canonical: process.env.NEXT_PUBLIC_APP_URL ?? 'https://getmyadvocate.org' },
}

export default function HomePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      {/*
        Brand stat anchor — source: KFF analysis of Healthcare.gov denial/appeal data.
        YMYL NOTE: When this stat appears in published SEO content, cite as
        "KFF data through 2023" and confirm with LPN/LVN reviewer before publish.
        Homepage and product UI copy does not require the same review gate as SEO articles,
        but the stat should be updated if KFF publishes newer figures.
      */}
      <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-4">
        Fewer than 1% of patients appeal — but 40–60% of those who do, win.
      </p>
      <h1 className="text-4xl font-bold mb-4">
        The insurance company has a team. Now you do too.
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        About 1 in 5 insurance claims are denied. Most people never push back — not because
        appeals don&apos;t work, but because the system is built to make it hard. MyAdvocate
        gives you the tools, the words, and the next steps to fight back.
      </p>
      <div className="flex gap-4 flex-wrap">
        <a
          href="/tools/denial-decoder"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium text-lg"
        >
          Decode Your Denial Code →
        </a>
        <a
          href="/auth"
          className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-medium text-lg"
        >
          Write an Appeal Letter
        </a>
      </div>
      <div className="mt-12 max-w-md">
        <p className="text-sm font-medium text-gray-700 mb-3">
          Get free tips on fighting denials.
        </p>
        <NewsletterCapture />
      </div>
    </main>
  )
}
