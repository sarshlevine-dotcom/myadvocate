// MA-EEAT-001 §5.1 — Trust infrastructure page: Citation Policy
// STATUS: ATTORNEY REVIEW RECOMMENDED (lower risk than other trust pages, but part of full review)
// Priority: Phase 1

export const metadata = {
  title: 'Citation Policy — How MyAdvocate Sources and Verifies Information',
  description:
    'MyAdvocate only cites government and major health authority sources. Learn which sources we accept, which we reject, and how citations are verified.',
}

export default function CitationPolicyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">

      <h1 className="text-3xl font-bold mb-2">Citation Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last reviewed by the MyAdvocate Editorial Board</p>

      <section className="mb-10">
        <p className="text-gray-700 mb-4">
          Because MyAdvocate publishes healthcare and patient rights information, we hold
          our sources to a strict standard. All factual claims must be anchored to
          verifiable, authoritative sources. This page defines exactly which sources
          are acceptable and which are not.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Accepted Sources</h2>
        <p className="text-gray-700 mb-4">
          MyAdvocate accepts citations only from the following source categories:
        </p>

        <div className="space-y-3">
          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-800 mb-1">Federal Government Health Agencies</p>
            <p className="text-gray-600 text-sm">
              Centers for Medicare &amp; Medicaid Services (CMS), National Institutes of Health (NIH),
              Centers for Disease Control and Prevention (CDC), U.S. Department of Health &amp; Human
              Services (HHS), HealthCare.gov, Medicare.gov, Medicaid.gov
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-800 mb-1">State Government Sources</p>
            <p className="text-gray-600 text-sm">
              State insurance commissioner offices, state department of health websites,
              and other official state agency websites (*.gov domains). Used for
              state-specific patient rights and insurance regulation content.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-800 mb-1">Peer-Reviewed Medical Literature</p>
            <p className="text-gray-600 text-sm">
              PubMed, NCBI, and other peer-reviewed research databases. Used selectively
              where clinical context is necessary.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-800 mb-1">Official Legal Sources</p>
            <p className="text-gray-600 text-sm">
              Federal statutes (U.S.C.), Code of Federal Regulations (CFR), and official
              state statutes accessed through government or .gov legal portals.
              All statutory citations are subject to attorney review before publication.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Sources We Do Not Accept</h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>Commercial insurance company websites or marketing materials</li>
          <li>Health information blogs, regardless of author credentials</li>
          <li>News articles or journalism (may reference, but cannot be primary source)</li>
          <li>Hospital or health system marketing websites</li>
          <li>Vendor, advocacy organization, or trade association publications (unless referencing their own government submissions)</li>
          <li>Wikipedia or other user-edited reference sources</li>
          <li>Sources that cannot be independently verified via a direct URL</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Minimum Citation Requirements</h2>
        <p className="text-gray-700 mb-4">
          Every content page on MyAdvocate must include a minimum of two citations
          from accepted sources. Pages with more substantive factual claims require
          proportionally more citations.
        </p>
        <p className="text-gray-700">
          Citations are verified as part of our automated pre-publication checks:
          source URLs are confirmed active, and source domains are checked against
          our approved domain list before a page enters the human review queue.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Stale Source Monitoring</h2>
        <p className="text-gray-700">
          We monitor cited URLs for changes and broken links as part of our content
          refresh system. When a source URL changes or becomes unavailable, the
          affected page is flagged for review and updated before remaining live.
          See our{' '}
          <a href="/update-policy" className="text-blue-600 underline">
            Update &amp; Refresh Policy
          </a>{' '}
          for details on our monitoring cadence.
        </p>
      </section>

      <p className="text-xs text-gray-400 mt-10 border-t pt-4">
        Last reviewed by the MyAdvocate Editorial Board. MyAdvocate provides navigation and
        advocacy information only — not legal or medical advice.
      </p>

    </main>
  )
}
