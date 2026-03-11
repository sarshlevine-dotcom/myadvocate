import { getResourcesByStateAndIssue } from '@/lib/db/resource-routes'
import { logEvent } from '@/lib/db/metric-events'
import type { UsState, IssueType } from '@/types/domain'

const STATES: { value: UsState; label: string }[] = [
  { value: 'CA', label: 'California' },
  { value: 'TX', label: 'Texas' },
  { value: 'NY', label: 'New York' },
]

const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: 'denial', label: 'Insurance Denial' },
  { value: 'billing', label: 'Medical Bill' },
  { value: 'access', label: 'Access to Care' },
]

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; issue?: string }>
}) {
  const params = await searchParams
  const VALID_STATES = STATES.map(s => s.value)
  const VALID_ISSUES = ISSUE_TYPES.map(t => t.value)

  const state = VALID_STATES.includes(params.state as UsState) ? params.state as UsState : undefined
  const issue = VALID_ISSUES.includes(params.issue as IssueType) ? params.issue as IssueType : undefined

  const resources =
    state && issue
      ? await getResourcesByStateAndIssue(state, issue)
      : []

  if (state && issue) {
    await logEvent({ eventType: 'page_view', sourcePage: '/resources' }).catch(() => {})
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Find Help in Your State</h1>
      <p className="text-gray-600 mb-8">
        Select your state and issue type to find the right agency to contact.
      </p>

      <form className="flex gap-4 mb-8 flex-wrap">
        <select name="state" defaultValue={state ?? ''} className="border rounded-lg px-4 py-2">
          <option value="">Select state...</option>
          {STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select name="issue" defaultValue={issue ?? ''} className="border rounded-lg px-4 py-2">
          <option value="">Select issue...</option>
          {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium">
          Find Resources
        </button>
      </form>

      {resources.length > 0 && (
        <div className="space-y-4">
          {resources.map(r => (
            <div key={r.id} className="border rounded-lg p-5">
              <h2 className="font-semibold text-lg mb-1">{r.resource_name}</h2>
              <a
                href={r.url?.startsWith('https://') ? r.url : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm"
              >
                Visit website →
              </a>
            </div>
          ))}
        </div>
      )}

      {state && issue && resources.length === 0 && (
        <p className="text-gray-500">No resources found for this combination yet.</p>
      )}
    </main>
  )
}
