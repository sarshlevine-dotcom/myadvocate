// MA-EEAT-001 §5.1 — Trust infrastructure page: Update & Refresh Policy
// STATUS: ATTORNEY REVIEW RECOMMENDED
// Priority: Phase 1

export const metadata = {
  title: 'Update & Refresh Policy — How MyAdvocate Keeps Content Current',
  description:
    'MyAdvocate monitors published content for policy changes, stale sources, and outdated information. Learn about our review cadence and what triggers a content update.',
}

export default function UpdatePolicyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">

      <h1 className="text-3xl font-bold mb-2">Update &amp; Refresh Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last reviewed by the MyAdvocate Editorial Board</p>

      <section className="mb-10">
        <p className="text-gray-700 mb-4">
          Healthcare regulations, insurance policies, and patient rights protections change
          regularly. A page that was accurate when published may become outdated when CMS
          updates its guidance, a state passes new patient protection legislation, or a
          federal regulation is amended.
        </p>
        <p className="text-gray-700">
          This policy describes how MyAdvocate monitors published content for staleness,
          what triggers a content review, and how we handle updates.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Review Dates</h2>
        <p className="text-gray-700">
          Every content page on MyAdvocate displays a &quot;Last Reviewed&quot; date. This date
          reflects the most recent review by the MyAdvocate Editorial Board — either
          at initial publication or at subsequent review. A &quot;Last Reviewed&quot; date is
          not a guarantee that the information remains current as of today. Always
          verify important information with official sources before taking action.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">What Triggers a Content Review</h2>
        <p className="text-gray-700 mb-4">
          Content is flagged for review when any of the following occur:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>
            <strong>Policy change detected:</strong> A monitoring system watches for
            updates from CMS, HHS, state insurance commissioners, and other authoritative
            sources that affect topics covered on MyAdvocate. When a relevant change is
            detected, affected pages are flagged.
          </li>
          <li>
            <strong>Source URL becomes unavailable:</strong> Cited source URLs are
            monitored for availability. A 404 or redirect that removes the cited content
            triggers a review to find a current source.
          </li>
          <li>
            <strong>Quarterly review cadence:</strong> All Tier 2 and Tier 3 pages
            are reviewed at least quarterly by the Editorial Board, regardless of
            whether a specific trigger has fired.
          </li>
          <li>
            <strong>Annual comprehensive review:</strong> All published pages undergo
            a full review at least annually. Pages covering state statutes or regulations
            include a license currency check for the clinical reviewer.
          </li>
          <li>
            <strong>User accuracy report:</strong> When a user reports a factual concern
            via admin@getmyadvocate.org, the flagged page is reviewed within 10 business days.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">How Updates Are Handled</h2>
        <p className="text-gray-700 mb-4">
          When a page is flagged for review, it goes through the same tier-appropriate
          review process as new content before any update is published:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>Tier 1 updates: automated checks plus editorial review</li>
          <li>Tier 2 updates: clinical reviewer review before publish</li>
          <li>Tier 3 updates: clinical reviewer review plus attorney review before publish</li>
        </ul>
        <p className="text-gray-700 mt-4">
          If a page requires significant correction, it may be temporarily unpublished
          while the update is prepared rather than left live with inaccurate information.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Report an Accuracy Concern</h2>
        <p className="text-gray-700">
          If you believe any content on MyAdvocate is inaccurate, out of date, or
          cites a source that has changed, please contact us at{' '}
          <a href="mailto:admin@getmyadvocate.org" className="text-blue-600 underline">
            admin@getmyadvocate.org
          </a>.
          Include the page URL and a description of the concern. We review all
          accuracy reports and respond within 10 business days.
        </p>
      </section>

      <p className="text-xs text-gray-400 mt-10 border-t pt-4">
        Last reviewed by the MyAdvocate Editorial Board. MyAdvocate provides navigation and
        advocacy information only — not legal or medical advice.
      </p>

    </main>
  )
}
