// MA-EEAT-001 §5.1 — Trust infrastructure page: Editorial Policy
// STATUS: ATTORNEY REVIEW REQUIRED before publish
// Priority: Launch blocker

export const metadata = {
  title: 'Editorial Policy — How MyAdvocate Researches and Publishes Content',
  description:
    'MyAdvocate\'s editorial standards, research methodology, source requirements, and content accuracy process. All content is reviewed before publication.',
}

export default function EditorialPolicyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">

      <h1 className="text-3xl font-bold mb-2">Editorial Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last reviewed by the MyAdvocate Editorial Board</p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Our Editorial Mission</h2>
        <p className="text-gray-700 mb-4">
          MyAdvocate publishes patient advocacy information in one of the most consequential
          content categories that exists: healthcare decisions that directly affect people&apos;s
          financial wellbeing and access to medical care. We take that responsibility seriously.
        </p>
        <p className="text-gray-700">
          Our editorial mission is to provide accurate, current, source-backed information that
          helps patients understand and exercise their rights — without overstating certainty,
          providing legal conclusions, or substituting for professional advice.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">How Topics Are Selected</h2>
        <p className="text-gray-700 mb-4">
          Topics are selected based on the real challenges patients face when navigating insurance
          denials, medical billing disputes, and healthcare access issues. We prioritize:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>High-frequency denial codes and billing issues that affect large numbers of patients</li>
          <li>Areas where patients consistently lack actionable information</li>
          <li>Topics where accurate sourcing from government and health authority sources is available</li>
          <li>Questions our users ask most frequently through our tools</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Drafting Standards</h2>
        <p className="text-gray-700 mb-4">All content is written to the following standards:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>
            <strong>Plain language:</strong> Content is written to be understood by patients without
            medical or legal training.
          </li>
          <li>
            <strong>Scope discipline:</strong> MyAdvocate covers navigation and advocacy information.
            We do not provide legal advice, medical diagnoses, or treatment recommendations.
          </li>
          <li>
            <strong>No outcome guarantees:</strong> We do not claim that appeals will succeed,
            bills will be reduced, or any specific outcome will result. We explain processes
            and rights — not results.
          </li>
          <li>
            <strong>Source anchoring:</strong> All factual claims are anchored to verifiable
            government or health authority sources. See our{' '}
            <a href="/citation-policy" className="text-blue-600 underline">Citation Policy</a>.
          </li>
          <li>
            <strong>Disclaimer inclusion:</strong> Every page carries a medical disclaimer
            clarifying the scope and limitations of MyAdvocate&apos;s information.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Content Review Process</h2>
        <p className="text-gray-700 mb-4">
          All content passes through a structured review process before publication.
          The process is tiered by risk level:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
          <li>
            <strong>Tier 1 — Denial code and billing information:</strong> Automated schema
            and quality checks, plus editorial spot review.
          </li>
          <li>
            <strong>Tier 2 — Rights summaries and advocacy guidance:</strong> Full review
            by the MyAdvocate Editorial Board, including our licensed clinical reviewer.
          </li>
          <li>
            <strong>Tier 3 — State patient rights and statutory content:</strong> Editorial
            Board review plus attorney sign-off before publication.
          </li>
        </ul>
        <p className="text-gray-700">
          For full details on the review process, reviewer qualifications, and what triggers
          each tier, see our{' '}
          <a href="/medical-review-policy" className="text-blue-600 underline">
            Medical Review Policy
          </a>.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Accuracy and Updates</h2>
        <p className="text-gray-700 mb-4">
          Healthcare policy and insurance regulations change. We monitor for changes that affect
          our content and update pages when source material changes, regulations are amended,
          or our review process identifies outdated information. Every page displays a
          &quot;Last Reviewed&quot; date.
        </p>
        <p className="text-gray-700">
          If you believe any content is inaccurate, incomplete, or outdated, please contact
          us at{' '}
          <a href="mailto:admin@getmyadvocate.org" className="text-blue-600 underline">
            admin@getmyadvocate.org
          </a>.
          We take accuracy reports seriously and review them promptly.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">What We Do Not Publish</h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>Legal advice or legal conclusions about a user&apos;s specific situation</li>
          <li>Medical diagnoses, treatment recommendations, or medication guidance</li>
          <li>Content that implies guaranteed outcomes from appeals or disputes</li>
          <li>Content sourced from commercial blogs, vendor sites, or non-authoritative sources</li>
          <li>State patient rights content that has not received attorney review</li>
        </ul>
      </section>

      <p className="text-xs text-gray-400 mt-10 border-t pt-4">
        Last reviewed by the MyAdvocate Editorial Board. MyAdvocate provides navigation and
        advocacy information only — not legal or medical advice.
      </p>

    </main>
  )
}
