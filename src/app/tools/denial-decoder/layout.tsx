import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Insurance Denial Code Decoder',
  description:
    'Enter your denial code from your Explanation of Benefits to find out what it means and what to do next. Free tool from MyAdvocate.',
  alternates: { canonical: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getmyadvocate.org'}/tools/denial-decoder` },
}

export default function DenialDecoderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
