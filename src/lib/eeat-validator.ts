// MA-EEAT-001 §8.1 — Five-Layer Automated Content Safety Stack
//
// All five layers must return PASS before a page enters the human review queue.
// A single FAIL returns the page to drafting with the specific triggering reason.
//
// Phase 2: this module is called directly from the CLI (scripts/validate-content.ts).
// When n8n activates, it wraps this module as a pre-review workflow node — no rewrite needed.
//
// Layer 1: Schema Completeness Gate  — all mandatory fields populated
// Layer 2: Citation Validity Gate    — min 2 citations, approved source domains
// Layer 3: Forbidden Claims Gate     — pattern match against MA-EEAT-001 §6.2 list
// Layer 4: Disclaimer Presence Gate  — medical disclaimer text block present
// Layer 5: Tier Routing Gate         — tier confirmed; Tier 3 triggers auto-escalate

import type { ContentPageSchema, ContentTier, EEATValidationResult } from '@/types/domain'

// ─── Approved source domains (MA-EEAT-001 §8.1 Layer 2) ──────────────────────
// Only government and major health authority domains are acceptable sources.
const APPROVED_SOURCE_DOMAINS = [
  'cms.gov',
  'nih.gov',
  'ncbi.nlm.nih.gov',
  'pubmed.ncbi.nlm.nih.gov',
  'cdc.gov',
  'hhs.gov',
  'healthcare.gov',
  'medicare.gov',
  'medicaid.gov',
  // State .gov domains — matched by suffix
  // Validated by isApprovedDomain() below
]

function isApprovedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    // Exact matches
    if (APPROVED_SOURCE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) {
      return true
    }
    // All US state government domains (*.state.xx.us or xx.gov pattern)
    if (hostname.endsWith('.gov')) return true
    if (hostname.endsWith('.state.us')) return true
    return false
  } catch {
    return false // malformed URL
  }
}

// ─── Forbidden claim patterns (MA-EEAT-001 §6.2) ─────────────────────────────
// Each entry: { pattern: RegExp, reason: string, suggestion: string }
const FORBIDDEN_CLAIM_PATTERNS: Array<{
  pattern: RegExp
  reason: string
  suggestion: string
}> = [
  {
    pattern: /you are entitled to(?!\s+\[.*?\]|\s+federal|\s+state|\s+under)/i,
    reason: 'Absolute entitlement claim without statute citation',
    suggestion: 'Use: "Federal law generally provides patients with..." + source citation',
  },
  {
    pattern: /your insurance (company |plan )?(must|is required to|is obligated to)(?!\s+\(depending|\s+under|\s+per|\s+pursuant)/i,
    reason: 'Absolute insurer obligation without qualifying language',
    suggestion: 'Use: "Insurers are typically required to... depending on your plan type"',
  },
  {
    pattern: /this appeal will (succeed|be approved|work|result in)/i,
    reason: 'Outcome guarantee on appeal result',
    suggestion: 'Use: "Appeals are more likely to succeed when..."',
  },
  {
    pattern: /\bguaranteed\b/i,
    reason: 'Use of "guaranteed" — prohibited in YMYL advocacy content',
    suggestion: 'Use: "may result in" or "can strengthen your case"',
  },
  {
    pattern: /will (definitely |certainly )?(result in|lead to|get you)/i,
    reason: 'Outcome certainty language',
    suggestion: 'Use: "may result in" or "can help you"',
  },
  {
    pattern: /legal advice/i,
    reason: 'Use of "legal advice" — MyAdvocate does not provide legal advice',
    suggestion: 'Use: "For legal questions, consult a licensed patient advocate or attorney"',
  },
  {
    pattern: /consult this (page|site|article) instead of (a lawyer|an attorney|legal counsel)/i,
    reason: 'Discouraging professional consultation',
    suggestion: 'Always direct users to consult professionals for legal questions',
  },
  {
    // Medical dosage / treatment recommendation detection
    pattern: /\b(\d+\s*mg|\d+\s*ml|\d+\s*mcg|\d+\s*units?)\b.*\b(take|dose|administer|prescribe)\b/i,
    reason: 'Medical dosage or treatment recommendation — outside MyAdvocate scope',
    suggestion: 'Redirect to: "speak with your healthcare provider"',
  },
  {
    pattern: /\bdiagnos(is|es|ed|ing)\b.*\bsuggests?\b/i,
    reason: 'Diagnosis interpretation — outside MyAdvocate scope',
    suggestion: 'Redirect to: "speak with your healthcare provider for diagnosis questions"',
  },
]

// ─── Required disclaimer text (MA-EEAT-001 §8.1 Layer 4) ─────────────────────
// The page body or medical_disclaimer_included flag must confirm disclaimer presence.
const DISCLAIMER_REQUIRED_PHRASES = [
  'not constitute legal or medical advice',
  'not a law firm',
  'consult a qualified attorney or healthcare professional',
]

// ─── Tier 3 escalation triggers (MA-EEAT-001 §8.1 Layer 5) ───────────────────
// If any of these patterns appear in a Tier 1 or Tier 2 page, auto-escalate to Tier 3.
const TIER_3_TRIGGERS: RegExp[] = [
  /state (law|statute|regulation|code)/i,
  /patient rights (act|law|statute)/i,
  /\b(42 usc|45 cfr|erisa|hipaa|cobra|aca|affordable care act)\b/i,
  /\b(lawsuit|litigation|sue|court|judgment|damages)\b/i,
  /nursing home rights/i,
  /hospital rights/i,
  /state insurance commissioner/i,
]

// ─── Required schema fields (MA-EEAT-001 §5.2) ───────────────────────────────
const REQUIRED_FIELDS: Array<keyof ContentPageSchema> = [
  'title',
  'meta_description',
  'content_tier',
  'target_problem',
  'cluster',
  'primary_source_1',
  'primary_source_2',
  'reviewer_name',
  'review_date',
  'last_updated_date',
  'medical_disclaimer_included',
  'forbidden_claims_check',
  'attorney_review_required',
  'publish_approved_by',
  'body',
]

// ─── validateEEAT — main export ───────────────────────────────────────────────
export function validateEEAT(page: Partial<ContentPageSchema>): EEATValidationResult {

  // ── Layer 1: Schema Completeness ─────────────────────────────────────────────
  const schemaErrors: string[] = []
  for (const field of REQUIRED_FIELDS) {
    const value = page[field]
    if (value === undefined || value === null || value === '') {
      schemaErrors.push(`Missing required field: "${field}"`)
    }
  }
  if (page.reviewer_name && page.reviewer_name !== 'MyAdvocate Clinical Review Team') {
    schemaErrors.push(
      `reviewer_name must be "MyAdvocate Clinical Review Team" — got: "${page.reviewer_name}"`
    )
  }
  const schemaPass = schemaErrors.length === 0

  // ── Layer 2: Citation Validity ────────────────────────────────────────────────
  const citationErrors: string[] = []
  const sources = [page.primary_source_1, page.primary_source_2].filter(Boolean) as string[]

  if (sources.length < 2) {
    citationErrors.push(`Minimum 2 citations required — found ${sources.length}`)
  }
  for (const url of sources) {
    if (!url.startsWith('http')) {
      citationErrors.push(`Citation is not a valid URL: "${url}"`)
      continue
    }
    if (!isApprovedDomain(url)) {
      citationErrors.push(
        `Citation domain not on approved list: "${url}" — approved: cms.gov, nih.gov, cdc.gov, *.gov`
      )
    }
  }
  const citationsPass = citationErrors.length === 0

  // ── Layer 3: Forbidden Claims ─────────────────────────────────────────────────
  const claimsErrors: string[] = []
  const bodyToCheck = page.body ?? ''

  for (const { pattern, reason, suggestion } of FORBIDDEN_CLAIM_PATTERNS) {
    if (pattern.test(bodyToCheck)) {
      claimsErrors.push(`FORBIDDEN CLAIM — ${reason}. Suggestion: ${suggestion}`)
    }
  }
  const claimsPass = claimsErrors.length === 0

  // ── Layer 4: Disclaimer Presence ──────────────────────────────────────────────
  const disclaimerErrors: string[] = []

  if (!page.medical_disclaimer_included) {
    disclaimerErrors.push('medical_disclaimer_included is false — disclaimer must be present on every page')
  } else {
    // Also verify disclaimer language appears in body if body is provided
    if (bodyToCheck) {
      const bodyLower = bodyToCheck.toLowerCase()
      const missingPhrases = DISCLAIMER_REQUIRED_PHRASES.filter(p => !bodyLower.includes(p.toLowerCase()))
      if (missingPhrases.length > 0) {
        disclaimerErrors.push(
          `Disclaimer text missing required phrases: ${missingPhrases.map(p => `"${p}"`).join(', ')}`
        )
      }
    }
  }
  const disclaimerPass = disclaimerErrors.length === 0

  // ── Layer 5: Tier Routing ──────────────────────────────────────────────────────
  const tierErrors: string[] = []
  let escalatedTo: ContentTier | undefined

  const currentTier = page.content_tier

  if (!currentTier || ![1, 2, 3].includes(currentTier)) {
    tierErrors.push(`content_tier must be 1, 2, or 3 — got: "${currentTier}"`)
  } else {
    // Check for Tier 3 triggers in a Tier 1 or Tier 2 page
    if (currentTier < 3 && bodyToCheck) {
      const triggeredPatterns = TIER_3_TRIGGERS.filter(p => p.test(bodyToCheck))
      if (triggeredPatterns.length > 0) {
        escalatedTo = 3
        tierErrors.push(
          `Tier 3 triggers detected in Tier ${currentTier} page — auto-escalate to Tier 3. ` +
          `Triggers matched: ${triggeredPatterns.length}. ` +
          `This page requires attorney review before publish.`
        )
      }
    }
    // Tier 3 pages must have attorney_review_required = true
    if ((escalatedTo === 3 || currentTier === 3) && !page.attorney_review_required) {
      tierErrors.push('Tier 3 page must have attorney_review_required: true')
    }
  }
  const tierPass = tierErrors.length === 0

  // ── Aggregate result ──────────────────────────────────────────────────────────
  const allPass = schemaPass && citationsPass && claimsPass && disclaimerPass && tierPass

  return {
    pass: allPass,
    layers: {
      schema:     { pass: schemaPass,    errors: schemaErrors    },
      citations:  { pass: citationsPass, errors: citationErrors  },
      claims:     { pass: claimsPass,    errors: claimsErrors    },
      disclaimer: { pass: disclaimerPass, errors: disclaimerErrors },
      tier:       { pass: tierPass,      errors: tierErrors, ...(escalatedTo ? { escalatedTo } : {}) },
    },
  }
}

// ─── Human-readable report ────────────────────────────────────────────────────
export function formatValidationReport(result: EEATValidationResult, pageTitle: string): string {
  const lines: string[] = [
    `═══════════════════════════════════════════════════`,
    `EEAT VALIDATION REPORT`,
    `Page: ${pageTitle}`,
    `Result: ${result.pass ? '✅ PASS — ready for human review queue' : '❌ FAIL — return to drafting'}`,
    `═══════════════════════════════════════════════════`,
  ]

  const layerNames: Record<keyof EEATValidationResult['layers'], string> = {
    schema:     'Layer 1 — Schema Completeness',
    citations:  'Layer 2 — Citation Validity',
    claims:     'Layer 3 — Forbidden Claims',
    disclaimer: 'Layer 4 — Disclaimer Presence',
    tier:       'Layer 5 — Tier Routing',
  }

  for (const [key, layer] of Object.entries(result.layers) as Array<[keyof EEATValidationResult['layers'], EEATValidationResult['layers'][keyof EEATValidationResult['layers']]]>) {
    lines.push(`\n${layerNames[key]}: ${layer.pass ? '✅ PASS' : '❌ FAIL'}`)
    if ('escalatedTo' in layer && layer.escalatedTo) {
      lines.push(`  ⚠ Auto-escalated to Tier ${layer.escalatedTo}`)
    }
    for (const err of layer.errors) {
      lines.push(`  • ${err}`)
    }
  }

  lines.push('\n═══════════════════════════════════════════════════')
  return lines.join('\n')
}
