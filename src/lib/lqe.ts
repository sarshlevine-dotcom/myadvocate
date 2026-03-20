// Letter Quality Evaluator — MA-AUT-006 §G1
// Three sequential checks: denial code accuracy → YMYL safety → legal framing.
// All checks are DETERMINISTIC (regex + DB lookup). NO Anthropic API calls.
// Serial execution: halts on first failure. Subsequent checks are marked 'not evaluated'.
// NEVER call the Anthropic SDK here — this gate is intentionally zero-cost.

import { getDenialCodeByCode } from '@/lib/db/denial-codes'
import type { LetterType } from '@/lib/generate-letter'
import { FORBIDDEN_PHRASES } from '@/lib/compliance-static'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckResult {
  passed: boolean
  score:  number     // 0.0–1.0
  notes?: string
}

export interface LQEInput {
  letterContent: string          // raw letter text from trackedExecution()
  letterType:    LetterType      // from src/types/domain.ts
  denialCode?:   string          // present for denial_appeal type
  artifactId:    string          // used for logging (may be content hash if artifact not yet written)
  userId:        string          // SHA-256 hashed before passing in — caller's responsibility
}

export interface LQEResult {
  passed:        boolean
  checks: {
    denialCodeAccuracy: CheckResult
    ymylSafety:         CheckResult
    legalFraming:       CheckResult
  }
  failureReason?: string         // populated when passed === false
}

// ─── Sentinel for halted checks ───────────────────────────────────────────────
// When serial execution halts on a failed check, subsequent checks receive this.
// Callers can detect skipped checks via notes === 'not evaluated'.
const NOT_RUN: CheckResult = { passed: true, score: 0, notes: 'not evaluated' }

// ─── YMYL forbidden patterns (Check 2) ───────────────────────────────────────
// Case-insensitive. Match any → score: 0.0, fail.
const YMYL_PATTERNS: RegExp[] = [
  /you (have|have been diagnosed|are diagnosed|suffer from)/i,
  /this (treatment|procedure|medication) is (not )?medically necessary/i,
  /you (do not|don't) need/i,
  /your (doctor|physician|provider) is wrong/i,
  /guarantee(d|s)? (coverage|approval|payment)/i,
  /will (definitely|certainly) be approved/i,
]

// ─── Legal framing forbidden patterns (Check 3) ───────────────────────────────
// Case-insensitive. The attorney/lawyer pattern only triggers in advice context.
const LEGAL_PATTERNS: RegExp[] = [
  /you are legally entitled to/i,
  /this (is|constitutes) (a )?(violation|breach) of .{0,10}(law|contract|regulation)/i,
  /you should (sue|file a lawsuit|take legal action)/i,
  /(you should|I recommend).{0,30}(attorney|lawyer)/i,
]

// ─── Check implementations ────────────────────────────────────────────────────

/**
 * CHECK 1 — Denial Code Accuracy
 * Only meaningful for denial_appeal with a provided denialCode.
 * Queries the denial_codes table and verifies the letter contains keywords
 * from the code's appeal_angle. Auto-passes for other letter types or when
 * the denial code is unknown (benefit of the doubt).
 */
async function checkDenialCodeAccuracy(
  letterContent: string,
  letterType:    LetterType,
  denialCode?:   string,
): Promise<CheckResult> {
  if (letterType !== 'denial_appeal' || !denialCode) {
    return { passed: true, score: 1.0 }
  }

  const record = await getDenialCodeByCode(denialCode)
  if (!record || !record.appeal_angle) {
    // Unknown code or missing appeal_angle — auto-pass (benefit of the doubt)
    return { passed: true, score: 1.0 }
  }

  // Extract meaningful keywords (> 4 chars) from appeal_angle
  const keywords = record.appeal_angle
    .toLowerCase()
    .split(/[\s,.()?!\-/]+/)
    .filter((w: string) => w.length > 4)

  if (keywords.length === 0) {
    return { passed: true, score: 1.0 }
  }

  const lowerLetter  = letterContent.toLowerCase()
  const matchedCount = keywords.filter((kw: string) => lowerLetter.includes(kw)).length
  const score        = matchedCount / keywords.length

  if (score >= 0.6) {
    return { passed: true, score }
  }

  return {
    passed: false,
    score,
    notes: `Appeal angle keywords not found in letter. Expected from: "${record.appeal_angle.slice(0, 120)}"`,
  }
}

/**
 * CHECK 2 — YMYL Safety
 * Scans for forbidden clinical determinations AND forbidden phrases from compliance-static.ts.
 * Runs for ALL letter types. Any match → immediate fail.
 * YMYL regex patterns checked first; FORBIDDEN_PHRASES checked second (case-insensitive).
 */
function checkYMYLSafety(letterContent: string): CheckResult {
  for (const pattern of YMYL_PATTERNS) {
    const match = letterContent.match(pattern)
    if (match) {
      return {
        passed: false,
        score:  0.0,
        notes:  `Forbidden YMYL pattern matched: "${match[0]}"`,
      }
    }
  }

  // Case-insensitive whole-word scan for FORBIDDEN_PHRASES (MA-SUP-AIR-001 AIR-04)
  // Uses \b word boundaries so single-word entries (e.g. "sue") don't match as substrings
  // inside longer words (e.g. "pursue", "issue").
  for (const phrase of FORBIDDEN_PHRASES) {
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`\\b${escapedPhrase}\\b`, 'i')
    if (pattern.test(letterContent)) {
      return {
        passed: false,
        score:  0.0,
        notes:  `forbidden_phrase_detected: "${phrase}"`,
      }
    }
  }

  return { passed: true, score: 1.0 }
}

/**
 * CHECK 3 — Legal Framing
 * Scans for attorney-level determinations or unsolicited legal advice.
 * Runs for ALL letter types.
 * Attorney/lawyer terms are only flagged in first-person advice context.
 */
function checkLegalFraming(letterContent: string): CheckResult {
  for (const pattern of LEGAL_PATTERNS) {
    const match = letterContent.match(pattern)
    if (match) {
      return {
        passed: false,
        score:  0.0,
        notes:  `Forbidden legal pattern matched: "${match[0]}"`,
      }
    }
  }
  return { passed: true, score: 1.0 }
}

// ─── runLQE ───────────────────────────────────────────────────────────────────

/**
 * Run the three-check LQE serial evaluator.
 * Returns LQEResult — caller (generate-letter.ts) acts on passed/failureReason.
 * NEVER writes to DB. NEVER calls the Anthropic API.
 */
export async function runLQE(input: LQEInput): Promise<LQEResult> {
  // ── CHECK 1: Denial Code Accuracy ─────────────────────────────────────────
  const denialCodeAccuracy = await checkDenialCodeAccuracy(
    input.letterContent,
    input.letterType,
    input.denialCode,
  )
  if (!denialCodeAccuracy.passed) {
    return {
      passed:        false,
      checks:        { denialCodeAccuracy, ymylSafety: NOT_RUN, legalFraming: NOT_RUN },
      failureReason: 'DENIAL_CODE_ACCURACY_FAIL',
    }
  }

  // ── CHECK 2: YMYL Safety ───────────────────────────────────────────────────
  const ymylSafety = checkYMYLSafety(input.letterContent)
  if (!ymylSafety.passed) {
    return {
      passed:        false,
      checks:        { denialCodeAccuracy, ymylSafety, legalFraming: NOT_RUN },
      failureReason: 'YMYL_SAFETY_FAIL',
    }
  }

  // ── CHECK 3: Legal Framing ─────────────────────────────────────────────────
  const legalFraming = checkLegalFraming(input.letterContent)
  if (!legalFraming.passed) {
    return {
      passed:        false,
      checks:        { denialCodeAccuracy, ymylSafety, legalFraming },
      failureReason: 'LEGAL_FRAMING_FAIL',
    }
  }

  return {
    passed: true,
    checks: { denialCodeAccuracy, ymylSafety, legalFraming },
  }
}
