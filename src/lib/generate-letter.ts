// Single Anthropic call boundary for all AI generation.
// MA-COST-001: Model routing, output caps, and budget tracking all live here.
// MA-SEC-002 P2: PII scrubbing runs before every API call — never bypass.
// NEVER call the Anthropic SDK directly from page or component code.

import Anthropic from '@anthropic-ai/sdk'
import { scrubPII } from '@/lib/pii-scrubber'
import { appendDisclaimer, CURRENT_DISCLAIMER_VERSION, getDisclaimerVersion } from '@/lib/disclaimer'
import { createArtifact } from '@/lib/db/artifacts'
import { addToReviewQueue, insertReviewQueueItem } from '@/lib/db/review-queue'
import { logEvent } from '@/lib/db/metric-events'
import { runLQE } from '@/lib/lqe'
import { insertLQEResult } from '@/lib/db/letter-quality-evaluations'
import { recordApiSpend } from '@/lib/budget-monitor'
import { trackedExecution } from '@/lib/tracked-execution'
import type { CanonicalFunctionName } from '@/lib/tracked-execution'
import { createHash } from 'crypto'
import type { ModelTier, ArtifactReleaseState } from '@/types/domain'

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

// ─── MA-AUT-006 §G1: Known letter types (runtime guard for Gate 1) ───────────
const VALID_LETTER_TYPES: readonly string[] = [
  'denial_appeal', 'bill_dispute', 'hipaa_request', 'negotiation_script',
]

// ─── MA-AUT-006 §G3: Context Firewall allowlist ───────────────────────────────
// Per letter type: only these keys in caseData may reach the prompt.
// Any key not listed here is stripped silently at Gate 3 before the API call.
const CONTEXT_ALLOWLIST: Record<LetterType, string[]> = {
  denial_appeal:      ['denialCode', 'insurerType', 'state', 'denialDate', 'planType', 'serviceType', 'denialReason'],
  bill_dispute:       ['billAmount', 'serviceType', 'serviceDate', 'facilityType', 'state', 'disputeReason', 'chargesChallenged'],
  hipaa_request:      ['state', 'facilityType', 'recordsRequested', 'preferredFormat', 'deliveryMethod'],
  negotiation_script: ['billAmount', 'serviceType', 'state', 'targetAmount', 'paymentCapacity'],
}

// ─── MA-ARC-FUNC-001: Letter type → canonical function name ──────────────────
// Used by trackedExecution() to label Langfuse traces.
const FUNCTION_NAME_MAP: Record<LetterType, CanonicalFunctionName> = {
  denial_appeal:      'generateAppealLetter',
  bill_dispute:       'generateDisputeLetter',
  hipaa_request:      'generateHIPAARequest',
  negotiation_script: 'generateNegotiationScript',
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

// ─── MA-AUT-006 §G7: Artifact state machine guard ────────────────────────────
// Phase 2 invariant: all artifacts must enter with release_state = 'review_required'.
// Exported for unit testing; treat as @internal — do not call from application code.
export function validateArtifactState(state: string): void {
  if (state !== 'review_required') {
    throw new Error(
      `GATE_7_FAILED: invalid release_state '${state}' — must be 'review_required' in Phase 2`,
    )
  }
}

// ─── generateLetter ───────────────────────────────────────────────────────────
export async function generateLetter(params: {
  caseId:       string
  userId:       string
  letterType:   LetterType
  caseData:     Record<string, unknown>
  hasDocument?: boolean   // MA-COST-001: triggers Sonnet routing for document-upload cases
}) {
  // ── Gate 1: Input Validation (MA-AUT-006 §G6) ─────────────────────────────
  // Required fields must be present and non-empty. letterType must be one of the four known values.
  const requiredFields = ['caseId', 'userId', 'letterType', 'caseData'] as const
  const missingFields = requiredFields.filter(f => {
    const val = params[f]
    return val === undefined || val === null || val === ''
  })
  if (missingFields.length > 0) {
    logEvent({ eventType: 'gate_failure', sourcePage: 'generateLetter', toolName: params.letterType }).catch(() => {})
    throw new Error(`GATE_1_FAILED: missing required fields: ${missingFields.join(', ')}`)
  }
  if (!VALID_LETTER_TYPES.includes(params.letterType)) {
    logEvent({ eventType: 'gate_failure', sourcePage: 'generateLetter' }).catch(() => {})
    throw new Error(`GATE_1_FAILED: invalid letterType: ${params.letterType}`)
  }

  // ── Gate 2: PII Scrub (MA-AUT-006 §G6 + MA-SEC-002 P2) ───────────────────
  // scrubPII() MUST run before any data reaches the prompt or the API.
  // Any exception from scrubPII is caught and re-thrown as GATE_2_FAILED.
  let scrubbed: Record<string, unknown>
  try {
    scrubbed = scrubPII(params.caseData)
  } catch {
    logEvent({ eventType: 'gate_failure', sourcePage: 'generateLetter', toolName: params.letterType }).catch(() => {})
    throw new Error('GATE_2_FAILED: PII_SCRUB_ERROR')
  }

  // ── Gate 3: Context Firewall (MA-AUT-006 §G6) ─────────────────────────────
  // Only allowlisted keys per letterType reach the prompt. Non-permitted keys are
  // stripped silently and logged. Gate 3 never throws — strip and continue.
  const allowedKeys = new Set(CONTEXT_ALLOWLIST[params.letterType])
  const blockedFields: string[] = []
  const filteredData: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(scrubbed)) {
    if (allowedKeys.has(key)) {
      filteredData[key] = val
    } else {
      blockedFields.push(key)
    }
  }
  if (blockedFields.length > 0) {
    logEvent({ eventType: 'gate_failure', sourcePage: 'generateLetter', toolName: params.letterType }).catch(() => {})
    console.warn(`GATE_3_STRIPPED [${params.letterType}]: ${blockedFields.join(', ')}`)
  }

  // Step 2: Resolve model tier (MA-COST-001)
  const routing    = MODEL_ROUTER[params.letterType]
  const modelTier: ModelTier = params.hasDocument ? routing.withDocument : routing.default
  const modelString = MODEL_STRINGS[modelTier]
  const { maxTokens } = OUTPUT_CONFIG[params.letterType]

  // Step 3: Build prompt + compute promptVersionHash (MA-SEC-002 P30)
  // Prompt is extracted before trackedExecution so the hash captures the exact text sent to the API.
  // promptVersionHash = SHA-256(prompt + model string + disclaimer version) — persisted on every artifact.
  const hashedUserId    = createHash('sha256').update(params.userId).digest('hex')
  const anthropic       = getAnthropicClient()
  const promptString    = PROMPTS[params.letterType](filteredData)
  const promptVersionHash = createHash('sha256')
    .update(promptString + modelString + CURRENT_DISCLAIMER_VERSION)
    .digest('hex')

  // Step 3b: Call Anthropic via trackedExecution (MA-ARC-FUNC-001)
  // userId is SHA-256 hashed — never pass raw Supabase auth UUID to the trace layer
  const { result: response, trace } = await trackedExecution(
    {
      functionName:         FUNCTION_NAME_MAP[params.letterType],
      callSource:           'app',
      userId:               hashedUserId,
      piiScrubberConfirmed: true,   // scrubPII ran in Gate 2
      qualityScore:         null,   // populated by LQE evaluator in future sprint (MA-AUT-006 §G1)
    },
    async () => {
      const res = await anthropic.messages.create({
        model:      modelString,
        max_tokens: maxTokens,
        messages:   [{ role: 'user', content: promptString }],
      })
      return {
        result: res,
        usage:  {
          model:        res.model,
          inputTokens:  res.usage.input_tokens,
          outputTokens: res.usage.output_tokens,
        },
      }
    },
  )

  const letterText = response.content[0].type === 'text' ? response.content[0].text : ''
  const { inputTokens, outputTokens } = trace   // sourced from trackedExecution — single source of truth

  // Step 4: Append disclaimer (MA-SEC-002 P7)
  const letterWithDisclaimer = appendDisclaimer(letterText)

  // Compute content hash here — used as LQE logging artifactId and storage path
  const contentHash = createHash('sha256').update(letterWithDisclaimer).digest('hex')

  // ── Gate 5: Letter Quality Evaluator (MA-AUT-006 §G1) ─────────────────────
  // Runs after trackedExecution produces content, before artifact is written.
  // Three sequential checks: denial code accuracy → YMYL safety → legal framing.
  // NEVER calls the Anthropic API. All checks are deterministic.
  const denialCode = typeof params.caseData.denialCode === 'string'
    ? params.caseData.denialCode
    : undefined

  const lqeResult = await runLQE({
    letterContent: letterText,
    letterType:    params.letterType,
    denialCode,
    artifactId:    contentHash,   // content hash serves as logging ID before artifact exists
    userId:        hashedUserId,  // already SHA-256 hashed above
  })

  // ── Gate 6: Disclaimer Version Check (MA-AUT-006 §G6 + MA-SEC-002 P30) ────
  // Capture the disclaimer version+hash after LQE confirms the output is safe.
  // Halts if version is empty — ensures every artifact records provenance data.
  const disclaimerInfo = getDisclaimerVersion()
  if (!disclaimerInfo.version) {
    logEvent({ eventType: 'gate_failure', sourcePage: 'generateLetter', toolName: params.letterType }).catch(() => {})
    throw new Error('GATE_6_FAILED: disclaimer version missing')
  }
  const { version: disclaimerVersion, hash: disclaimerHash } = disclaimerInfo

  // ── Gate 7: Artifact State Machine (MA-AUT-006 §G6) ──────────────────────
  // Phase 2 invariant: release_state is ALWAYS 'review_required' — never 'released' or 'pending'.
  // validateArtifactState() is the runtime guard that halts if this invariant is ever violated.
  const storagePath   = `artifacts/${params.caseId}/${contentHash}.txt`
  const releaseState: ArtifactReleaseState = 'review_required'
  validateArtifactState(releaseState)

  let artifact: Awaited<ReturnType<typeof createArtifact>>
  try {
    artifact = await createArtifact({
      caseId:             params.caseId,
      userId:             params.userId,
      artifactType:       params.letterType,
      releaseState,
      disclaimerVersion,
      disclaimerHash,
      contentHash,
      storagePath,
      content:            letterWithDisclaimer,
      promptVersionHash,
    })
  } catch {
    logEvent({ eventType: 'gate_failure', sourcePage: 'generateLetter', toolName: params.letterType }).catch(() => {})
    throw new Error('GATE_7_FAILED: ARTIFACT_STATE_ERROR')
  }

  logEvent({
    eventType:  'gate_7_passed',
    sourcePage: 'generateLetter',
    toolName:   params.letterType,
    caseId:     params.caseId,
  }).catch(() => {})

  // Step 6: Persist LQE result + route to review queue
  // Write LQE evaluation to letter_quality_evaluations table (MA-AUT-006 §G1).
  // Non-blocking — telemetry loss is acceptable; blocking delivery is not.
  insertLQEResult({
    artifactId: artifact.id,
    caseId:     params.caseId,
    letterType: params.letterType,
    lqeResult,
    userIdHash: hashedUserId,
    iteration:  1,
  }).catch((err) => {
    console.error('[generateLetter] LQE write-back failed (non-fatal):', err)
  })

  // LQE-failed letters route to Kate via insertReviewQueueItem (with failure context).
  // LQE-passed letters route via standard addToReviewQueue (Phase 2: all outputs reviewed).
  if (lqeResult.passed) {
    logEvent({
      eventType:  'lqe_passed',
      sourcePage: 'generateLetter',
      toolName:   params.letterType,
      caseId:     params.caseId,
    }).catch(() => {})

    await addToReviewQueue({
      artifactId: artifact.id,
      caseId:     params.caseId,
      riskReason: 'Phase 2 — all outputs require review (LQE passed)',
    })
  } else {
    logEvent({
      eventType:  'lqe_failed',
      sourcePage: 'generateLetter',
      toolName:   params.letterType,
      caseId:     params.caseId,
    }).catch(() => {})

    await insertReviewQueueItem({
      artifactId:    artifact.id,
      caseId:        params.caseId,
      failureReason: lqeResult.failureReason!,
      letterType:    params.letterType,
      userId:        hashedUserId,
    })
  }

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

  // Determine response content:
  // LQE-passed  → standard letter with disclaimer
  // LQE-failed  → letter + pending review notice (DO NOT throw — user still gets a response)
  const PENDING_REVIEW_NOTE =
    '\n\n---\nThis letter is pending clinical review. You will receive the final version within 24 hours.'
  const responseContent = lqeResult.passed
    ? letterWithDisclaimer
    : letterWithDisclaimer + PENDING_REVIEW_NOTE

  // Return content alongside the DB record so callers can surface it without
  // a round-trip back to Supabase Storage (it's already in memory here).
  return { ...artifact, content: responseContent }
}
