// MA-EEAT-001 §5.1 — Trust infrastructure page: About MyAdvocate
// STATUS: ATTORNEY REVIEW REQUIRED before publish
// Priority: Launch blocker — no SEO content goes live until this page is published

export const metadata = {
  title: 'About MyAdvocate — Who We Are and Why We Exist',
  description:
    'MyAdvocate helps patients navigate insurance denials and medical billing disputes. Learn about our mission, editorial team, and commitment to accurate, trustworthy patient advocacy information.',
}

export default function AboutPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">

      <h1 className="text-3xl font-bold mb-4">About MyAdvocate</h1>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Why MyAdvocate Exists</h2>
        <p className="text-gray-700 mb-4">
          Every year, millions of Americans receive insurance denial letters they don&apos;t understand,
          medical bills they can&apos;t verify, and healthcare systems they can&apos;t navigate. Most have
          no idea they have the right to appeal, dispute, or request records — and even fewer know how.
        </p>
        <p className="text-gray-700 mb-4">
          MyAdvocate exists to change that. We build free, easy-to-use tools that help patients
          understand their rights, generate professional appeal letters, and navigate the systems
          that stand between them and the care they need.
        </p>
        <p className="text-gray-700">
          We do not take sides with insurers or hospitals. We are on the side of the patient.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">What MyAdvocate Is — and Is Not</h2>
        <p className="text-gray-700 mb-4">
          MyAdvocate is a patient advocacy information platform. We provide:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
          <li>Plain-language explanations of insurance denial codes and billing practices</li>
          <li>Template letters and scripts to help patients exercise their rights</li>
          <li>Information about federal and state patient protections</li>
          <li>Guidance on how to navigate the appeals and dispute process</li>
        </ul>
        <p className="text-gray-700 mb-4">
          MyAdvocate is <strong>not</strong> a law firm and does not provide legal advice.
          MyAdvocate is <strong>not</strong> a medical provider and does not provide medical advice.
          For legal questions specific to your situation, consult a licensed attorney or
          patient advocate. For medical questions, consult your healthcare provider.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Our Editorial Team</h2>
        <p className="text-gray-700 mb-4">
          All content on MyAdvocate is produced and reviewed by a team that combines technology,
          editorial discipline, and clinical expertise.
        </p>
        <p className="text-gray-700 mb-4">
          The <strong>MyAdvocate Editorial Board</strong> includes licensed healthcare professionals
          with direct experience in the systems patients encounter during healthcare crises — including
          insurance administration, nursing facility operations, and patient advocacy. Our clinical
          reviewer brings over 20 years of healthcare experience spanning direct patient care and
          healthcare management.
        </p>
        <p className="text-gray-700">
          All medically and clinically relevant content is reviewed by our Editorial Board before
          publication. Content involving state patient rights, statutory citations, or legal
          interpretation is additionally reviewed by a licensed attorney before publish.
          Our full review process is described in our{' '}
          <a href="/medical-review-policy" className="text-blue-600 underline">
            Medical Review Policy
          </a>.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Our Commitment to Accuracy</h2>
        <p className="text-gray-700 mb-4">
          Healthcare information changes. Policies, regulations, and denial code definitions are
          updated regularly. We maintain a structured content refresh system to keep our information
          current. Every page displays a &quot;Last Reviewed&quot; date, and we monitor for policy changes
          that may require updates.
        </p>
        <p className="text-gray-700">
          If you believe any content on MyAdvocate is inaccurate or out of date, please contact
          us at{' '}
          <a href="mailto:admin@getmyadvocate.org" className="text-blue-600 underline">
            admin@getmyadvocate.org
          </a>.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Privacy and Your Information</h2>
        <p className="text-gray-700">
          We take the privacy of our users seriously. MyAdvocate does not sell user data,
          does not use health information for advertising, and maintains strict architectural
          separation between personal identifiers and case data. For full details, see our
          Privacy Policy.
        </p>
      </section>

      <p className="text-xs text-gray-400 mt-10 border-t pt-4">
        Last reviewed by the MyAdvocate Editorial Board. MyAdvocate provides navigation and
        advocacy information only — not legal or medical advice.
      </p>

    </main>
  )
}
