import Anthropic from '@anthropic-ai/sdk'
import { scrubPII } from '@/lib/pii-scrubber'
import { appendDisclaimer, CURRENT_DISCLAIMER_VERSION } from '@/lib/disclaimer'
import { createArtifact } from '@/lib/db/artifacts'
import { addToReviewQueue } from '@/lib/db/review-queue'
import { createHash } from 'crypto'

// Lazy init — avoids throwing at import time when ANTHROPIC_API_KEY not yet set (e.g. tests)
function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

const PROMPTS = {
  denial_appeal: (data: Record<string, unknown>) => `
You are helping a patient appeal an insurance denial. Based on the following structured information,
write a professional appeal letter. Do not include any personal identifiers in the letter body —
use placeholders like [PATIENT NAME] and [MEMBER ID] instead.

Situation: ${JSON.stringify(data)}

Write a clear, professional appeal letter that:
1. States the reason for appeal
2. References relevant patient rights and insurance regulations for the stated state
3. Requests urgent reconsideration
4. Is respectful but firm
`,
}

export async function generateLetter(params: {
  caseId: string
  userId: string
  letterType: 'denial_appeal'
  caseData: Record<string, unknown>
}) {
  // Step 1: Scrub PII (MA-SEC-002 P2)
  const scrubbed = scrubPII(params.caseData)

  // Step 2: Call Anthropic
  const anthropic = getAnthropicClient()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: PROMPTS[params.letterType](scrubbed) }],
  })
  const letterText = response.content[0].type === 'text' ? response.content[0].text : ''

  // Step 3: Append disclaimer (MA-SEC-002 P7)
  const letterWithDisclaimer = appendDisclaimer(letterText)

  // Step 4: Store in Supabase Storage + create Artifact record
  const contentHash = createHash('sha256').update(letterWithDisclaimer).digest('hex')
  const storagePath = `artifacts/${params.caseId}/${contentHash}.txt`

  const artifact = await createArtifact({
    caseId: params.caseId,
    userId: params.userId,
    artifactType: params.letterType,
    releaseState: 'review_required',  // Phase 1: ALL outputs require review
    disclaimerVersion: CURRENT_DISCLAIMER_VERSION,
    contentHash,
    storagePath,
    content: letterWithDisclaimer,
  })

  // Step 5: Add to review queue
  await addToReviewQueue({
    artifactId: artifact.id,
    caseId: params.caseId,
    riskReason: 'Phase 1 — all outputs require founder review',
  })

  return artifact
}
