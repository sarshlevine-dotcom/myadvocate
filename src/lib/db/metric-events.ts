import { createClient } from '@/lib/supabase/server'
import type { EventType } from '@/types/domain'

export async function logEvent(params: {
  eventType: EventType
  sourcePage: string
  toolName?: string
  caseId?: string
}) {
  const supabase = await createClient()
  // MA-SEC-002 P13: NO user PII — only event metadata
  await supabase.from('metric_events').insert({
    event_type: params.eventType,
    source_page: params.sourcePage,
    tool_name: params.toolName ?? null,
    case_id: params.caseId ?? null,
  })
}
