// MA-EEAT-001 §5.1 + §3.2 — Trust infrastructure page: Reviewer Credentials
// STATUS: ATTORNEY REVIEW REQUIRED before publish (specifically: Kate to confirm accuracy)
// Priority: Launch blocker
// Note: Anonymous format per MA-EEAT-001 §3.2. No individual names disclosed publicly.
//       Internal credential verification file maintained separately (not this page).

export const metadata = {
  title: 'Editorial Board & Reviewer Credentials — MyAdvocate',
  description:
    'MyAdvocate\'s Editorial Board includes licensed healthcare professionals with 20+ years of experience. Learn about our clinical review credentials and review process.',
}

export default function ReviewerCredentialsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">

      <h1 className="text-3xl font-bold mb-2">Editorial Board &amp; Reviewer Credentials</h1>
      <p className="text-sm text-gray-500 mb-8">Last reviewed by the MyAdvocate Editorial Board</p>

      <section className="mb-10">
        <p className="text-gray-700 mb-4">
          MyAdvocate publishes healthcare navigation content reviewed by qualified professionals.
          This page describes the credentials of our Editorial Board and the verification
          process we maintain for clinical reviewers.
        </p>
        <p className="text-gray-700">
          To protect the privacy of our team, we do not publicly display individual names.
          Credential documentation is maintained internally and available to authorized parties
          as part of our compliance documentation upon request.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Clinical Reviewer</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="font-semibold text-gray-800 text-lg mb-1">
            MyAdvocate Editorial Board — Clinical Reviewer
          </p>
          <p className="text-blue-700 text-sm font-medium mb-4">
            Licensed Nursing Professional &nbsp;|&nbsp; 20+ Years Healthcare Experience
          </p>

          <div className="space-y-3 text-gray-700 text-sm">
            <p>
              <span className="font-semibold">License:</span> Licensed nursing professional
              with an active license maintained in good standing. License documentation
              verified annually.
            </p>
            <p>
              <span className="font-semibold">Experience:</span> Over 20 years of direct
              healthcare experience spanning clinical patient care and healthcare operations
              management.
            </p>
            <p>
              <span className="font-semibold">Specialization relevant to MyAdvocate:</span>{' '}
              Nursing operations and management, hospital administration, skilled nursing
              facility standards, and patient advocacy systems. This background provides
              direct expertise in the institutional processes — insurance administration,
              billing workflows, coverage decision pathways — that patients encounter
              during healthcare crises.
            </p>
            <p>
              <span className="font-semibold">Review scope:</span> All Tier 2 content
              (patient rights summaries, federal protections, advocacy guidance) receives
              full clinical review before publication. Tier 1 content (denial codes,
              billing information) receives clinical spot-check on a quarterly sample basis.
              Tier 3 content (state patient rights, statutory content) receives clinical
              review plus attorney sign-off.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Credential Verification Process</h2>
        <p className="text-gray-700 mb-4">
          MyAdvocate maintains internal documentation for all Editorial Board members who
          review medically or clinically relevant content. This documentation includes:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>Current professional license number and issuing state</li>
          <li>Annual license verification screenshot from the issuing state nursing board</li>
          <li>A signed statement of review role and scope</li>
          <li>Documentation of relevant experience and specialization</li>
        </ul>
        <p className="text-gray-700 mt-4">
          This documentation is not displayed publicly. It is maintained to support
          compliance verification and is available to authorized parties upon request.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Attorney Review</h2>
        <p className="text-gray-700">
          All Tier 3 content — state patient rights pages, hospital rights, nursing home rights,
          and any content citing state statutes or requiring legal interpretation — is reviewed
          by a licensed attorney before publication. This is a non-negotiable step in the
          Tier 3 review process and cannot be bypassed under time pressure or other
          circumstances.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Questions About Our Review Process</h2>
        <p className="text-gray-700">
          If you have questions about how specific content was reviewed or want to report
          a factual concern, contact us at{' '}
          <a href="mailto:admin@getmyadvocate.org" className="text-blue-600 underline">
            admin@getmyadvocate.org
          </a>.
          For full details on the review workflow, see our{' '}
          <a href="/medical-review-policy" className="text-blue-600 underline">
            Medical Review Policy
          </a>.
        </p>
      </section>

      <p className="text-xs text-gray-400 mt-10 border-t pt-4">
        Last reviewed by the MyAdvocate Editorial Board. MyAdvocate provides navigation and
        advocacy information only — not legal or medical advice.
      </p>

    </main>
  )
}
