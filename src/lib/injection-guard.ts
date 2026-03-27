// MA-SEC-002 P21: Intake Content Sanitization Gate
// MA-SEC-002 P23: Quarantine and Escalation Path
//
// Scans allowlisted caseData string values for prompt injection markers before
// prompt construction. Called in Gate 5.5 of the 7-gate chain — never bypassed.
//
// P21: detects and rejects injection attempts before prompt interpolation.
// P23: logs attempt to metric_events, increments per-session Redis counter,
//      triggers founder alert when session count reaches 3.

import { Redis } from '@upstash/redis'
import { logEvent } from '@/lib/db/metric-events'

// ─── Injection marker patterns ────────────────────────────────────────────────
// Conservative scope — overly broad patterns produce false positives on medical content
// (e.g. "Prior authorization" must not match "prior instructions").
// Document each addition: what attack technique it covers.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(previous|prior|all)\s+(instructions?|prompts?|context)/i, // direct override
  /you\s+are\s+now\s+(a|an)\s+/i,                                       // role reassignment
  /act\s+as\s+(a|an)\s+/i,                                              // role reassignment
  /pretend\s+(you\s+are|to\s+be)/i,                                     // role reassignment
  /forget\s+(everything|all)\s+(you|previous)/i,                        // context wipe
  /system\s*:\s*you/i,                                                   // fake system message
  /\[SYSTEM\]/,                                                          // fake system tag
  /<\|im_start\|>/,                                                      // ChatML injection
  /###\s*instruction/i,                                                  // instruction header
  /override\s+(previous|prior)\s+(instructions?|prompts?)/i,            // override directive
  /disregard\s+(previous|prior|all)\s+(instructions?|prompts?)/i,       // disregard directive
  /jailbreak/i,                                                          // explicit jailbreak
  /DAN\s+mode/i,                                                         // DAN technique
  /new\s+persona/i,                                                      // persona swap
]

export function scanForInjection(value: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(value))
}

// Scan all string values in a context object.
// Returns names of flagged fields — empty array means clean.
export function scanContextFields(data: Record<string, unknown>): string[] {
  return Object.entries(data)
    .filter(([, val]) => typeof val === 'string' && scanForInjection(val as string))
    .map(([key]) => key)
}

// ─── MA-SEC-002 P23: Per-user injection flag counter ─────────────────────────
// Backed by the existing Upstash Redis instance (same as rate-limit.ts).
// Counter TTL: 1 hour (session window). Resets after 1 hour of no flags.
const FLAG_TTL_SECONDS = 3600
const FLAG_KEY_PREFIX  = 'myadvocate:injection:'

function getRedis(): Redis {
  // Uses ?? '' so module load never throws during next build — same pattern as rate-limit.ts.
  return new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL   ?? '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  })
}

export async function incrementInjectionFlag(userId: string): Promise<number> {
  const redis = getRedis()
  const key   = `${FLAG_KEY_PREFIX}${userId}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, FLAG_TTL_SECONDS)
  return count
}

// P23 three-step response on each detected injection attempt:
//   Step 1 — caller throws generic error (done in Gate 5.5, not here)
//   Step 2 — log to metric_events with session context
//   Step 3 — increment per-session counter
// Returns updated flag count so caller can check escalation threshold (>= 3).
// Never throws — telemetry loss must not block the gate's rejection path.
export async function recordInjectionAttempt(params: {
  userId:        string
  letterType:    string
  flaggedFields: string[]
}): Promise<number> {
  // Step 2: log with session context
  logEvent({
    eventType:  'injection_attempt',
    sourcePage: 'generateLetter',
    toolName:   params.letterType,
    userId:     params.userId,
  }).catch(() => {})

  // Step 3: increment per-session counter
  try {
    return await incrementInjectionFlag(params.userId)
  } catch (err) {
    console.error('[injection-guard] Redis increment failed (non-fatal):', err)
    // Conservative: treat Redis failure as threshold-hit so caller escalates
    return 3
  }
}
