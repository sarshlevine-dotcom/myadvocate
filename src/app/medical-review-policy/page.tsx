// MA-EEAT-001 §5.1 — Trust infrastructure page: Medical Review Policy
// STATUS: ATTORNEY REVIEW REQUIRED before publish
// Priority: Launch blocker

export const metadata = {
  title: 'Medical Review Policy — How MyAdvocate Reviews Health Content',
  description:
    'MyAdvocate\'s three-tier clinical review system. Learn how our Editorial Board reviews content, what qualifies our clinical reviewer, and what triggers attorney review.',
}

export default function MedicalReviewPolicyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">

      <h1 className="text-3xl font-bold mb-2">Medical Review Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last reviewed by the MyAdvocate Editorial Board</p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Why Clinical Review Matters</h2>
        <p className="text-gray-700 mb-4">
          MyAdvocate publishes content that helps patients navigate insurance denials and
          medical billing disputes. This content falls in the category Google and healthcare
          compliance standards refer to as YMYL — Your Money or Your Life — because errors
          can directly affect a patient&apos;s financial situation and healthcare access.
        </p>
        <p className="text-gray-700">
          To meet this responsibility, all health-adjacent content is reviewed by qualified
          members of the MyAdvocate Editorial Board before publication. This page describes
          who reviews our content, how the review process works, and what triggers each
          level of review.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Our Clinical Reviewer</h2>
        <p className="text-gray-700 mb-4">
          Clinical and medically relevant content on MyAdvocate is reviewed by a member of
          our Editorial Board with the following qualifications:
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-4">
          <p className="font-semibold text-gray-800 mb-1">
            MyAdvocate Editorial Board — Clinical Reviewer
          </p>
          <p className="text-gray-700 text-sm mb-2">
            Licensed Nursing Professional &nbsp;|&nbsp; 20+ Years Healthcare Experience
          </p>
          <p className="text-gray-600 text-sm">
            Our clinical reviewer brings over two decades of direct patient care and healthcare
            management experience, with particular depth in nursing operations, hospital
            administration, skilled nursing facility care, and patient advocacy systems.
            This combination of clinical grounding and institutional healthcare knowledge is
            directly relevant to the insurance navigation and billing dispute issues
            MyAdvocate covers.
          </p>
        </div>
        <p className="text-gray-700 text-sm">
          Reviewer credentials are maintained on file and verified annually. License
          documentation is held internally and available upon request to authorized parties
          as part of our compliance documentation.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Three-Tier Review System</h2>
        <p className="text-gray-700 mb-4">
          Review depth is proportional to content risk. All content passes automated checks
          before any human review begins.
        </p>

        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-800 mb-1">Tier 1 — Denial Code &amp; Billing Information</p>
            <p className="text-gray-600 text-sm mb-2">
              <span className="font-medium">What it covers:</span> Insurance denial code definitions,
              billing code explanations, general process guidance without state-specific legal claims.
            </p>
            <p className="text-gray-600 text-sm">
              <span className="font-medium">Review process:</span> Automated schema validation,
              citation check, forbidden claims check, and disclaimer verification. Plus editorial
              spot-check by the MyAdvocate team. Clinical reviewer spot-checks a sample of
              Tier 1 pages each quarter.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-800 mb-1">Tier 2 — Patient Rights &amp; Advocacy Guidance</p>
            <p className="text-gray-600 text-sm mb-2">
              <span className="font-medium">What it covers:</span> Patient rights summaries,
              federal protections (HIPAA, ACA, ERISA), appeal strategy guides, billing dispute
              guidance without state-specific statutory interpretation.
            </p>
            <p className="text-gray-600 text-sm">
              <span className="font-medium">Review process:</span> Full review by the MyAdvocate
              clinical reviewer before publication. All automated Tier 1 checks also apply.
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <p className="font-semibold text-gray-800 mb-1">Tier 3 — State Patient Rights &amp; Statutory Content</p>
            <p className="text-gray-600 text-sm mb-2">
              <span className="font-medium">What it covers:</span> State-specific patient rights,
              hospital rights, nursing home rights, content citing state statutes or regulations,
              content requiring legal interpretation.
            </p>
            <p className="text-gray-600 text-sm">
              <span className="font-medium">Review process:</span> Clinical reviewer review
              plus attorney review and sign-off before publication. All automated checks apply.
              Attorney sign-off is non-negotiable for Tier 3 content.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Automated Pre-Review Checks</h2>
        <p className="text-gray-700 mb-4">
          Before any page enters the human review queue, it is automatically checked for:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>All required schema fields populated (title, tier, cluster, sources, reviewer slot, review date)</li>
          <li>Minimum two citations present from approved source domains (CMS, NIH, CDC, state government)</li>
          <li>No forbidden claim patterns (outcome guarantees, absolute obligations, legal conclusions)</li>
          <li>Medical disclaimer text present and complete</li>
          <li>Correct tier classification — content with state law or statutory triggers is automatically escalated to Tier 3</li>
        </ul>
        <p className="text-gray-700 mt-4">
          A page that fails any automated check is returned to drafting. It does not enter
          human review until all checks pass.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Update and Refresh Policy</h2>
        <p className="text-gray-700">
          Published content is monitored for changes that may require updates, including
          policy changes at CMS, HHS, or state insurance commissioners, statute amendments,
          and source URL changes. See our{' '}
          <a href="/update-policy" className="text-blue-600 underline">Update &amp; Refresh Policy</a>{' '}
          for full details on review cadence and what triggers an update.
        </p>
      </section>

      <p className="text-xs text-gray-400 mt-10 border-t pt-4">
        Last reviewed by the MyAdvocate Editorial Board. MyAdvocate provides navigation and
        advocacy information only — not legal or medical advice.
      </p>

    </main>
  )
}
