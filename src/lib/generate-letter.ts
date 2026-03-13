// Single Anthropic call boundary for all AI generation.
// MA-COST-001: Model routing, output caps, and budget tracking all live here.
// MA-SEC-002 P2: PII scrubbing runs before every API call — never bypass.
// NEVER call the Anthropic SDK directly from page or component code.

import Anthropic from '@anthropic-ai/sdk'
import { scrubPII } from '@/lib/pii-scrubber'
import { appendDisclaimer, CURRENT_DISCLAIMER_VERSION } from '@/lib/disclaimer'
import { createArtifact } from '@/lib/db/artifacts'
import { addToReviewQueue } from '@/lib/db/review-queue'
import { logEvent } from '@/lib/db/metric-events'
import { recordApiSpend } from '@/lib/budget-monitor'
import { createHash } from 'crypto'
import type { ModelTier } from '@/types/domain'

// Lazy init — avoids throwing at import time when ANTHROPIC_API_KEY not yet set (e.g. tests)
function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

// ─── Letter types ─────────────────────────────────────────────────────────────
// All four Phase 1 tools. Add new types here as features ship; never inline.
export type LetterType =
  | 'denial_appeal'
  | 'bill_dispute'
  | 'hipaa_request'
  | 'negotiation_script'

// ─── MA-COST-001: Model strings ────────────────────────────────────────────────
// Canonical strings live here only. Update when Anthropic releases new versions.
const MODEL_STRINGS: Record<ModelTier, string> = {
  haiku:  'claude-haiku-4-5-20251001',   // default workhorse — cheapest acceptable quality
  sonnet: 'claude-sonnet-4-6',           // reserved for complex/document-upload cases
}

// ─── MA-COST-001: Model routing table ─────────────────────────────────────────
// Rule: use Haiku unless a document is present or the case is flagged complex.
// Attorney routing (Phase 2+) will add a 'complex' override path — document here when built.
const MODEL_ROUTER: Record<LetterType, { default: ModelTier; withDocument: ModelTier }> = {
  denial_appeal:      { default: 'haiku', withDocument: 'sonnet' },
  bill_dispute:       { default: 'haiku', withDocument: 'sonnet' },
  hipaa_request:      { default: 'haiku', withDocument: 'haiku'  }, // highly templated; Haiku sufficient
  negotiation_script: { default: 'haiku', withDocument: 'haiku'  }, // short output; Haiku sufficient
}

// ─── MA-COST-001: Hard output caps ────────────────────────────────────────────
// Never let the model write essays. Shorter outputs = direct cost savings.
const OUTPUT_CONFIG: Record<LetterType, { maxTokens: number }> = {
  denial_appeal:      { maxTokens: 600 },   // professional letter, ~400–500 words
  bill_dispute:       { maxTokens: 500 },   // dispute letter, ~350–400 words
  hipaa_request:      { maxTokens: 400 },   // formal records request, ~250–300 words
  negotiation_script: { maxTokens: 200 },   // phone script, strictly under 150 words
}

// ─── Prompts ──────────────────────────────────────────────────────────────────
// MA-COST-001: Prompts are type-specific and compact.
// Disclaimers, boilerplate, and citation blocks are post-processed — never resent per call.
const PROMPTS: Record<LetterType, (data: Record<string, unknown>) => string> = {

  denial_appeal: (data) => `\
You are helping a patient appeal an insurance denial. Write a professional appeal letter \
using the structured information below. Use placeholders like [PATIENT NAME] and [MEMBER ID] \
instead of any personal identifiers.

Situation: ${JSON.stringify(data)}

Write a clear, firm appeal letter that: states the denial reason and grounds for appeal; \
references the patient's rights and applicable state regulations; requests urgent reconsideration. \
Keep it under 450 words.`,

  bill_dispute: (data) => `\
You are helping a patient dispute an incorrect or excessive medical bill. Write a professional \
dispute letter using the structured information below. Use placeholders like [PATIENT NAME] \
and [ACCOUNT NUMBER] instead of any personal identifiers.

Situation: ${JSON.stringify(data)}

Write a clear dispute letter that: identifies the specific charges being disputed; states the \
grounds for dispute; references applicable billing rights; requests an itemized bill and \
correction. Keep it under 380 words.`,

  hipaa_request: (data) => `\
You are helping a patient request their medical records under HIPAA. Write a formal records \
request using the structured information below. Use placeholders like [PATIENT NAME] and \
[DATE OF BIRTH] instead of any personal identifiers.

Situation: ${JSON.stringify(data)}

Write a formal HIPAA request that: cites 45 CFR §164.524; specifies the records requested; \
states the preferred format and delivery method; sets a 30-day response deadline. \
Keep it under 320 words.`,

  negotiation_script: (data) => `\
You are helping a patient negotiate their medical bill by phone. Write a concise phone script \
using the structured information below. Use placeholders like [YOUR NAME] and [ACCOUNT NUMBER] \
instead of any personal identifiers.

Situation: ${JSON.stringify(data)}

Write a practical script that: opens with the account reference; states the negotiation goal; \
makes 2–3 key points; handles one likely objection; closes with next steps. \
Strictly under 140 words.`,
}

// ─── generateLetter ───────────────────────────────────────────────────────────
export async function generateLetter(params: {
  caseId:       string
  userId:       string
  letterType:   LetterType
  caseData:     Record<string, unknown>
  hasDocument?: boolean   // MA-COST-001: triggers Sonnet routing for document-upload cases
}) {
  // Step 1: Scrub PII (MA-SEC-002 P2) — MUST run before every API call
  const scrubbed = scrubPII(params.caseData)

  // Step 2: Resolve model tier (MA-COST-001)
  const routing    = MODEL_ROUTER[params.letterType]
  const modelTier: ModelTier = params.hasDocument ? routing.withDocument : routing.default
  const modelString = MODEL_STRINGS[modelTier]
  const { maxTokens } = OUTPUT_CONFIG[params.letterType]

  // Step 3: Call Anthropic
  const anthropic = getAnthropicClient()
  const response = await anthropic.messages.create({
    model:      modelString,
    max_tokens: maxTokens,
    messages:   [{ role: 'user', content: PROMPTS[params.letterType](scrubbed) }],
  })
  const letterText = response.content[0].type === 'text' ? response.content[0].text : ''
  const { input_tokens: inputTokens, output_tokens: outputTokens } = response.usage

  // Step 4: Append disclaimer (MA-SEC-002 P7)
  const letterWithDisclaimer = appendDisclaimer(letterText)

  // Step 5: Store artifact in Supabase
  const contentHash  = createHash('sha256').update(letterWithDisclaimer).digest('hex')
  const storagePath  = `artifacts/${params.caseId}/${contentHash}.txt`

  const artifact = await createArtifact({
    caseId:             params.caseId,
    userId:             params.userId,
    artifactType:       params.letterType,
    releaseState:       'review_required',   // Phase 1: ALL outputs require review
    disclaimerVersion:  CURRENT_DISCLAIMER_VERSION,
    contentHash,
    storagePath,
    content:            letterWithDisclaimer,
  })

  // Step 6: Add to review queue
  await addToReviewQueue({
    artifactId:   artifact.id,
    caseId:       params.caseId,
    riskReason:   'Phase 1 — all outputs require founder review',
  })

  // Step 7: Record spend + check budget tripwires (MA-COST-001)
  // Non-blocking — budget monitor failure MUST NOT block letter delivery
  recordApiSpend({
    inputTokens,
    outputTokens,
    modelTier,
    letterType: params.letterType,
  }).catch(() => {})

  // Step 8: Telemetry — letter_generated with cost fields (MA-COST-001, PMP v19 §8)
  // Non-blocking; MA-SEC-002 P13: userId is auth UUID only — never PII
  logEvent({
    eventType:    'letter_generated',
    sourcePage:   '/api/generate',
    toolName:     params.letterType,
    caseId:       params.caseId,
    userId:       params.userId,
    modelUsed:    modelTier,
    inputTokens,
    outputTokens,
  }).catch(() => {})

  // Return content alongside the DB record so callers can surface it without
  // a round-trip back to Supabase Storage (it's already in memory here).
  return { ...artifact, content: letterWithDisclaimer }
}
