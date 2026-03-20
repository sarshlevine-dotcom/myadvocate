// MA-SUP-AIR-001 AIR-04 — Static compliance rules
// Pure TypeScript constants. NO async. NO DB imports. NO Anthropic imports.
// Single source of truth for forbidden phrases (LQE Gate 6) and forbidden
// context fields (Gate 5). All consumers import from here — never duplicate.

import type { LetterType } from '@/types/domain'

// ─── Phrases that must NEVER appear in generated letters ─────────────────────
// Scanned case-insensitively by LQE Check 2 (YMYL safety).
// Failure reason: 'forbidden_phrase_detected' in CheckResult notes.
export const FORBIDDEN_PHRASES: string[] = [
  'you will win',
  'guaranteed',
  'we guarantee',
  'you are entitled to',
  'lawsuit',
  'sue',
  'attorney',
  'legal action',
  'malpractice',
]

// ─── Fields that must NEVER reach the prompt ─────────────────────────────────
// Belt-and-suspenders over CONTEXT_ALLOWLIST in Gate 5.
// Gate 2 (PII scrubber) already removes most of these, but Gate 5 provides
// a second enforcement layer if a future change accidentally adds one to the
// CONTEXT_ALLOWLIST or if scrubPII is bypassed in a test path.
export const FORBIDDEN_CONTEXT_FIELDS: string[] = [
  'ssn',
  'socialSecurityNumber',
  'dateOfBirth',
  'dob',
  'bankAccount',
  'creditCard',
  'password',
  'token',
  'apiKey',
]

// ─── Letter types requiring Kate review regardless of LQE pass ───────────────
// Empty in Phase 2 — LQE pass = direct delivery (Phase 2 all-review model overrides).
// Reserved for Phase 3+ when high-risk letter types may always require clinical eyes.
export const ALWAYS_KATE_REVIEW: LetterType[] = []

// ─── Maximum letter length in characters ─────────────────────────────────────
// Safety ceiling above the token cap. Prevents output that technically fits the token
// budget but would be unreasonably long in rendered form.
// Rough approximation: ~5 chars/token × OUTPUT_CONFIG[type].maxTokens.
export const MAX_LETTER_CHARS: Record<LetterType, number> = {
  denial_appeal:      3000,
  bill_dispute:       2500,
  hipaa_request:      2000,
  negotiation_script: 1000,
}
