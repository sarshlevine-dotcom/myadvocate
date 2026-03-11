import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MyAdvocate — Fight Your Insurance Denial',
  description:
    'Insurance denial? We help patients understand denial codes, write professional appeal letters, and find state resources. Start free.',
  alternates: { canonical: process.env.NEXT_PUBLIC_APP_URL ?? 'https://getmyadvocate.org' },
}

export default function HomePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Fight Your Insurance Denial</h1>
      <p className="text-xl text-gray-600 mb-8">
        Don't let a denial letter be the end. MyAdvocate helps you understand what happened and write a professional appeal.
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
    </main>
  )
}
