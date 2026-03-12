import { createClient } from '@/lib/supabase/server'
import type { EventType, ModelTier } from '@/types/domain'

export async function logEvent(params: {
  eventType: EventType
  sourcePage: string
  toolName?: string
  caseId?: string
  // PMP v19 §8 — per-case telemetry fields (MA-SEC-002 P13: UUID only, never PII)
  userId?: string
  amountCents?: number
  subscriptionId?: string
  // MA-COST-001: AI cost tracking fields (migration 015_ai_spend_tracking)
  modelUsed?: ModelTier
  inputTokens?: number
  outputTokens?: number
}) {
  const supabase = await createClient()
  // MA-SEC-002 P13: NO user PII — only event metadata
  await supabase.from('metric_events').insert({
    event_type:      params.eventType,
    source_page:     params.sourcePage,
    tool_name:       params.toolName       ?? null,
    case_id:         params.caseId         ?? null,
    user_id:         params.userId         ?? null,
    amount_cents:    params.amountCents    ?? null,
    subscription_id: params.subscriptionId ?? null,
    model_used:      params.modelUsed      ?? null,
    input_tokens:    params.inputTokens    ?? null,
    output_tokens:   params.outputTokens   ?? null,
  })
}
