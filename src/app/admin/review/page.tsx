'use client'
import { useState, useEffect } from 'react'

type ReviewItem = {
  id: string
  case_id: string
  created_at: string
  risk_reason: string | null
  artifact_id: string
}

export default function AdminReviewPage() {
  const [pending, setPending] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/review').then(r => r.json()).then(data => {
      setPending(data)
      setLoading(false)
    })
  }, [])

  async function handleAction(item: ReviewItem, action: 'approve' | 'reject') {
    await fetch(`/api/admin/review/${item.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, artifactId: item.artifact_id }),
    })
    setPending(prev => prev.filter(i => i.id !== item.id))
  }

  if (loading) return <main className="p-8">Loading...</main>

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Founder Review Queue ({pending.length} pending)</h1>
      {pending.length === 0 && <p className="text-gray-500">No items pending review.</p>}
      {pending.map(item => (
        <div key={item.id} className="border rounded-lg p-6 mb-4">
          <div className="flex justify-between items-start mb-3">
            <span className="text-sm text-gray-500">Case {item.case_id}</span>
            <span className="text-sm text-gray-500">{new Date(item.created_at).toLocaleString()}</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">Risk: {item.risk_reason}</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleAction(item, 'approve')}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm"
            >
              Approve
            </button>
            <button
              onClick={() => handleAction(item, 'reject')}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </main>
  )
}
