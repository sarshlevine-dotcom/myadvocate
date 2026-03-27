// Single Anthropic call boundary for all AI generation.
// MA-COST-001: Model routing, output caps, and budget tracking all live here.
// MA-SEC-002 P2: PII scrubbing runs before every API call — never bypass.
// MA-AUT-006 §G6: 7-gate chain enforced on every call — see gate comments below.
// NEVER call the Anthropic SDK directly from page or component code.

import Anthropic from '@anthropic-ai/sdk'
import { scrubPII, verifyScrubbed } from '@/lib/pii-scrubber'
import { checkTierAuthorization } from '@/lib/auth-tier'
import { appendDisclaimer, CURRENT_DISCLAIMER_VERSION, getDisclaimerVersion, DISCLAIMERS } from '@/lib/disclaimer'
import { createArtifact } from '@/lib/db/artifacts'
import { addToReviewQueue, insertReviewQueueItem } from '@/lib/db/review-queue'
import { logEvent } from '@/lib/db/metric-events'
import { scanContextFields, recordInjectionAttempt } from '@/lib/injection-guard'
import { sendInjectionEscalationAlert } from '@/lib/mailer'
import { runLQE } from '@/lib/lqe'
import { insertLQEResult } from '@/lib/db/letter-quality-evaluations'
import { recordApiSpend } from '@/lib/budget-monitor'
import { parseLetterOutput } from '@/lib/letter-output-schema'
import { trackedExecution } from '@/lib/tracked-execution'
import type { CanonicalFunctionName } from '@/lib/tracked-execution'
import { createHash } from 'crypto'
import type { ModelTier, ArtifactReleaseState, LetterType, WorkflowContract, LetterOutputSchema } from '@/types/domain'
import { FORBIDDEN_CONTEXT_FIELDS } from '@/lib/compliance-static'

// Re-export LetterType so existing callers (tests, API routes) keep working unchanged.
export type { LetterType } from '@/types/domain'

// Lazy init — avoids throwing at import time when ANTHROPIC_API_KEY not yet set (e.g. tests)
function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

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
// Exported so Gate 3 tests can verify max_tokens in the API call matches this spec.
export const OUTPUT_CONFIG: Record<LetterType, { maxTokens: number }> = {
  denial_appeal:      { maxTokens: 600 },   // professional letter, ~400–500 words
  bill_dispute:       { maxTokens: 500 },   // dispute letter, ~350–400 words
  hipaa_request:      { maxTokens: 400 },   // formal records request, ~250–300 words
  negotiation_script: { maxTokens: 200 },   // phone script, strictly under 150 words
}

// ─── MA-AUT-006 §G5: Context Firewall allowlist ───────────────────────────────
// Per letter type: only these keys in caseData may reach the prompt.
// Any key not listed here is stripped silently at Gate 5 before the API call.
// Exported for AIR-04 (compliance-static.ts) which reads allowed keys per letter type.
export const CONTEXT_ALLOWLIST: Record<LetterType, string[]> = {
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

// ─── MA-SUP-AIR-001 AIR-03: validateLetterOutput() ───────────────────────────
// Validates the generated letter meets structural requirements and returns a typed
// LetterOutputSchema. Called inside Gate 7, before 7a (disclaimer version check).
// Defense-in-depth: Gate 3 enforces max_tokens upstream; this catches any overruns.
// Synchronous — zero Anthropic API calls.
// Exported for unit testing; treat as @internal — do not call from application code.
export function validateLetterOutput(params: {
  content:           string
  letterType:        LetterType
  disclaimerAppended: boolean
  promptVersionHash: string
  modelUsed:         string
  tokenCount:        number
  lqePassed:         boolean
}): LetterOutputSchema {
  if (!params.content) {
    throw new Error('GATE_7_FAILED: EMPTY_OUTPUT — letter content must be non-empty')
  }
  if (!params.promptVersionHash) {
    throw new Error('GATE_7_FAILED: MISSING_PROMPT_VERSION_HASH — required for artifact provenance (MA-SEC-002 P30)')
  }
  const cap = OUTPUT_CONFIG[params.letterType]?.maxTokens
  if (cap !== undefined && params.tokenCount > cap) {
    throw new Error(
      `GATE_7_FAILED: TOKEN_CAP_EXCEEDED — tokenCount=${params.tokenCount} exceeds cap=${cap} for ${params.letterType}`,
    )
  }
  return {
    content:           params.content,
    letterType:        params.letterType,
    disclaimerAppended: params.disclaimerAppended,
    promptVersionHash: params.promptVersionHash,
    modelUsed:         params.modelUsed,
    tokenCount:        params.tokenCount,
    lqePassed:         params.lqePassed,
  }
}

// ─── MA-SUP-AIR-001 AIR-01: WorkflowContract builder ────────────────────────
// Constructs the typed contract for this invocation before Gate 1 runs.
// Exported so AIR-03/AIR-04 and tests can verify contract shape in isolation.
// Safe for unknown letterTypes — zero-value fallbacks let Gate 3 handle the error.
export function buildWorkflowContract(userId: string, letterType: LetterType): WorkflowContract {
  const capConfig = OUTPUT_CONFIG[letterType]
  return {
    userId,
    letterType,
    tierAuthRequired:         true,
    piiScrubbed:              true,
    maxTokens:                capConfig?.maxTokens ?? 0,  // 0 if unconfigured — Gate 3 catches this
    allowedContextKeys:       CONTEXT_ALLOWLIST[letterType] ?? [],
    lqeRequired:              true,
    disclaimerVersionRequired: true,
    releaseState:             'review_required',
    // outputSchema omitted — populated by validateLetterOutput() inside Gate 7 post-generation
  }
}

// ─── Gate failure logger ──────────────────────────────────────────────────────
// Emits a structured audit event for every gate failure. Non-blocking (.catch) —
// telemetry loss must never prevent the gate from halting execution.
// Accepts optional contract so every gate_failure includes the attempted invocation shape.
function logGateFailure(letterType: string, contract?: WorkflowContract) {
  if (contract) {
    console.error('[generateLetter] gate_failure contract snapshot:', JSON.stringify(contract))
  }
  logEvent({
    eventType:  'gate_failure',
    sourcePage: 'generateLetter',
    toolName:   letterType,
  }).catch(() => {})
}

// ─── generateLetter ───────────────────────────────────────────────────────────
export async function generateLetter(params: {
  caseId:       string
  userId:       string
  letterType:   LetterType
  caseData:     Record<string, unknown>
  hasDocument?: boolean   // MA-COST-001: triggers Sonnet routing for document-upload cases
}) {
  // ── AIR-01: Build WorkflowContract (MA-SUP-AIR-001) ───────────────────────
  // Built before Gate 1 so the contract is available in all logGateFailure calls,
  // providing a full snapshot of the attempted invocation in every gate_failure event.
  const contract = buildWorkflowContract(params.userId, params.letterType)

  // ── Gate 1: Tier Authorization (MA-AUT-006 §G6 + MA-SEC-002 P25/P26) ───────
  // First gate in the chain. checkTierAuthorization() verifies the user is allowed
  // to generate this letter type at their current subscription tier.
  // Handles: empty userId, invalid letterType, free-tier monthly limits,
  // and past-due / canceled subscriptions. Conservative block on any DB error.
  // Halts execution immediately — no data is processed if the user is unauthorized.
  const authResult = await checkTierAuthorization(params.userId, params.letterType)
  if (!authResult.authorized) {
    logGateFailure(params.letterType, contract)
    throw new Error(`GATE_1_FAILED: ${authResult.code}:${authResult.reason}`)
  }

  // ── Gate 2: PII Scrub + Clean Assertion (MA-AUT-006 §G6 + MA-SEC-002 P2) ───
  // scrubPII() strips all known PII field names from caseData.
  // verifyScrubbed() asserts the scrub ran and no PII key names remain.
  // Both must pass before any data reaches the prompt or the Anthropic API.
  // Any exception from either function → GATE_2_FAILED; API is never called.
  let scrubbed: Record<string, unknown>
  try {
    scrubbed = scrubPII(params.caseData)
    verifyScrubbed(scrubbed)
  } catch (err) {
    const msg    = err instanceof Error ? err.message : 'PII_SCRUB_ERROR'
    const detail = msg.startsWith('PII_FIELDS_REMAINING') ? msg : 'PII_SCRUB_ERROR'
    logGateFailure(params.letterType, contract)
    throw new Error(`GATE_2_FAILED: ${detail}`)
  }

  // ── Gate 3: Output Cap Enforcement (MA-AUT-006 §G6 + MA-COST-001) ─────────
  // Verifies a valid, positive maxTokens cap exists in OUTPUT_CONFIG for this letterType.
  // Halts if the cap is missing, zero, or negative — prevents unbounded API spend and
  // catches any future attempt to introduce a letterType without a corresponding cap.
  // The resolved value is locked into a const after this point; no override is possible.
  const capConfig = OUTPUT_CONFIG[params.letterType]
  if (!capConfig || !capConfig.maxTokens || capConfig.maxTokens <= 0) {
    logGateFailure(params.letterType, contract)
    throw new Error(
      `GATE_3_FAILED: OUTPUT_CAP_OVERRIDE — no valid cap configured for letterType=${params.letterType}`,
    )
  }
  const maxTokens = capConfig.maxTokens  // locked — never reassigned after Gate 3

  // ── Gate 4: Input Validation (MA-AUT-006 §G6) — defense-in-depth ──────────
  // Belt-and-suspenders check for required fields. caseId is the primary new check
  // here; userId and caseData are also validated as a secondary guard in case a
  // future code path bypasses Gates 1 or 2.
  const requiredFields = ['caseId', 'userId', 'caseData'] as const
  const missingFields  = requiredFields.filter(f => {
    const val = params[f]
    return val === undefined || val === null || val === ''
  })
  if (missingFields.length > 0) {
    logGateFailure(params.letterType, contract)
    throw new Error(`GATE_4_FAILED: missing required fields: ${missingFields.join(', ')}`)
  }

  // ── Gate 5: Context Firewall (MA-AUT-006 §G6 + MA-SUP-AIR-001 AIR-04) ────
  // Two-layer strip before any data reaches the prompt:
  //   Layer A — FORBIDDEN_CONTEXT_FIELDS (belt-and-suspenders over PII scrub):
  //             always strip these keys regardless of allowlist membership.
  //             Logged as GATE_5_FORBIDDEN_FIELD.
  //   Layer B — CONTEXT_ALLOWLIST: strip any key not explicitly allowlisted.
  //             Logged as GATE_5_STRIPPED.
  // Gate 5 never throws — strip-and-continue; logging is the enforcement signal.
  const allowedKeys        = new Set(CONTEXT_ALLOWLIST[params.letterType])
  const forbiddenFieldSet  = new Set(FORBIDDEN_CONTEXT_FIELDS)
  const blockedFields: string[]   = []
  const forbiddenFound: string[]  = []
  const filteredData: Record<string, unknown> = {}

  for (const [key, val] of Object.entries(scrubbed)) {
    if (forbiddenFieldSet.has(key)) {
      // Layer A: always strip — never reaches prompt even if allowlisted
      forbiddenFound.push(key)
    } else if (allowedKeys.has(key)) {
      filteredData[key] = val
    } else {
      // Layer B: not in allowlist
      blockedFields.push(key)
    }
  }

  if (forbiddenFound.length > 0) {
    logGateFailure(params.letterType, contract)
    console.warn(`GATE_5_FORBIDDEN_FIELD [${params.letterType}]: ${forbiddenFound.join(', ')}`)
  }
  if (blockedFields.length > 0) {
    logGateFailure(params.letterType, contract)
    console.warn(`GATE_5_STRIPPED [${params.letterType}]: ${blockedFields.join(', ')}`)
  }

  // ── Gate 5.5: Injection Scan (MA-SEC-002 P21/P23) ─────────────────────────
  // Scans string values in filteredData for prompt injection markers.
  // Runs after Gate 5 strips unknown keys — only allowlisted values are scanned.
  // P21: rejects flagged input before prompt construction.
  // P23 three-step: (2) logEvent in recordInjectionAttempt, (3) Redis counter in
  //                 recordInjectionAttempt; (1) generic throw is below.
  // P24: rejection message is deliberately generic — never confirm injection detected.
  const flaggedFields = scanContextFields(filteredData)
  if (flaggedFields.length > 0) {
    const flagCount = await recordInjectionAttempt({
      userId:        params.userId,
      letterType:    params.letterType,
      flaggedFields,
    })
    logGateFailure(params.letterType, contract)
    // P23: escalate to founder on 3+ flags within session (fire-and-forget)
    if (flagCount >= 3) {
      sendInjectionEscalationAlert({
        userId:     params.userId,
        letterType: params.letterType,
        flagCount,
      }).catch(() => {})
    }
    throw new Error('GATE_5_INJECTION_BLOCKED: input validation failed')
  }

  // Model routing (MA-COST-001)
  const routing     = MODEL_ROUTER[params.letterType]
  const modelTier: ModelTier = params.hasDocument ? routing.withDocument : routing.default
  const modelString = MODEL_STRINGS[modelTier]

  // Build prompt + compute promptVersionHash (MA-SEC-002 P30)
  // Prompt is extracted before trackedExecution so the hash captures the exact text sent to the API.
  // promptVersionHash = SHA-256(prompt + model string + disclaimer version) — persisted on every artifact.
  const hashedUserId      = createHash('sha256').update(params.userId).digest('hex')
  const anthropic         = getAnthropicClient()
  const promptString      = PROMPTS[params.letterType](filteredData)
  const promptVersionHash = createHash('sha256')
    .update(promptString + modelString + CURRENT_DISCLAIMER_VERSION)
    .digest('hex')

  // API call via trackedExecution (MA-ARC-FUNC-001)
  // userId is SHA-256 hashed — never pass raw Supabase auth UUID to the trace layer
  const { result: response, trace } = await trackedExecution(
    {
      functionName:         FUNCTION_NAME_MAP[params.letterType],
      callSource:           'app',
      userId:               hashedUserId,
      piiScrubberConfirmed: true,   // scrubPII + verifyScrubbed both passed in Gate 2
      qualityScore:         null,   // populated by LQE evaluator in future sprint (MA-AUT-006 §G1)
    },
    async () => {
      const res = await anthropic.messages.create({
        model:      modelString,
        max_tokens: maxTokens,   // Gate 3 guarantees this equals OUTPUT_CONFIG[letterType].maxTokens
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

  // Append disclaimer (MA-SEC-002 P7)
  const letterWithDisclaimer = appendDisclaimer(letterText)

  // Compute content hash — used as LQE logging artifactId and storage path
  const contentHash = createHash('sha256').update(letterWithDisclaimer).digest('hex')

  // ── Gate 6: Letter Quality Evaluator (MA-AUT-006 §G1) ─────────────────────
  // Runs after trackedExecution produces content, before artifact is written.
  // Three sequential checks: denial code accuracy → YMYL safety → legal framing.
  // NEVER calls the Anthropic API. All checks are deterministic.
  // Gate 6 does not throw — failed letters route to Kate's review queue.
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

  // ── Gate 7: Post-Generation Integrity (MA-AUT-006 §G6) ────────────────────
  // Three sequential sub-checks — all must pass; all throw GATE_7_FAILED on failure.
  //
  // 7-pre — Output Schema Validation (AIR-03): validateLetterOutput() asserts the generated
  //         letter is non-empty, has a valid promptVersionHash, and outputTokens <= cap.
  //         Defense-in-depth over Gate 3's max_tokens enforcement.
  //
  // 7a — Disclaimer Version: getDisclaimerVersion() must return a non-empty version string.
  //      Ensures every artifact records its disclaimer provenance (MA-SEC-002 P30).
  //      Halts before artifact creation if the version is missing.
  //
  // 7b — Artifact State Machine: validateArtifactState() asserts release_state is
  //      'review_required' (Phase 2 invariant). createArtifact() persists the record.
  //      Any DB failure is caught and re-thrown as GATE_7_FAILED.

  // 7-pre: Output Schema Validation (AIR-03)
  validateLetterOutput({
    content:           letterText,
    letterType:        params.letterType,
    disclaimerAppended: true,   // appendDisclaimer() ran above; letterWithDisclaimer is in scope
    promptVersionHash,
    modelUsed:         modelString,
    tokenCount:        outputTokens,
    lqePassed:         lqeResult.passed,
  })

  // 7-pre-content: Zod content-level schema validation (H1-04)
  // Validates letter structure: subject, body length, letterType, disclaimer, optional denialCode.
  // On failure: logGateFailure + throw. Never proceeds with unvalidated output.
  if (!letterText || letterText.trim().length === 0) {
    logGateFailure(params.letterType, contract)
    throw new Error('GATE_7_FAILED: EMPTY_LETTER_OUTPUT')
  }
  const subject = letterText.split('\n').find(line => line.trim().length > 0) ?? params.letterType
  try {
    parseLetterOutput({
      subject,
      body:        letterText,
      letterType:  params.letterType,
      disclaimer:  DISCLAIMERS[CURRENT_DISCLAIMER_VERSION],
      denialCode,
    })
  } catch (err) {
    logGateFailure(params.letterType, contract)
    throw err instanceof Error && err.message.startsWith('GATE_7_FAILED')
      ? err
      : new Error(`GATE_7_FAILED: LETTER_SCHEMA_INVALID — ${err instanceof Error ? err.message : String(err)}`)
  }

  // 7a: Disclaimer Version Check
  const disclaimerInfo = getDisclaimerVersion()
  if (!disclaimerInfo.version) {
    logGateFailure(params.letterType, contract)
    throw new Error('GATE_7_FAILED: disclaimer version missing')
  }
  const { version: disclaimerVersion, hash: disclaimerHash } = disclaimerInfo

  // 7b: Artifact State Machine + DB write
  const storagePath   = `artifacts/${params.caseId}/${contentHash}.txt`
  const releaseState: ArtifactReleaseState = 'review_required'
  validateArtifactState(releaseState)   // throws GATE_7_FAILED if invariant is violated

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
    logGateFailure(params.letterType, contract)
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
