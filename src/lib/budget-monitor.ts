// MA-COST-001: API spend tracking and budget tripwire enforcement
//
// Tracks estimated Anthropic API cost in Redis (per-day and per-month counters).
// Fires console alerts at 50% / 80% / 100% of the $150/month cap.
// Phase 2: replace console alerts with email/Slack via n8n webhook.
//
// Redis keys:
//   budget:monthly:YYYY-MM   → running monthly cost in fractional cents (float)
//   budget:daily:YYYY-MM-DD  → running daily cost in fractional cents (float)
//
// Cost model (conservative estimates — update if Anthropic pricing changes):
//   haiku  input:  $0.80 / 1M tokens  = 0.00008 cents/token
//   haiku  output: $4.00 / 1M tokens  = 0.0004  cents/token
//   sonnet input:  $3.00 / 1M tokens  = 0.0003  cents/token
//   sonnet output: $15.00 / 1M tokens = 0.0015  cents/token

import { Redis } from '@upstash/redis'
import type { ModelTier } from '@/types/domain'

// Monthly budget cap in cents ($150)
const MONTHLY_BUDGET_CENTS = 15_000

// Alert thresholds as fraction of monthly budget
const THRESHOLDS = {
  warning:  0.50,   // 50% → $75
  review:   0.80,   // 80% → $120 — auto-review, throttle non-essential
  throttle: 1.00,   // 100% → $150 — disable non-essential AI features
} as const

export type BudgetAlertLevel = 'ok' | 'warning' | 'review' | 'throttle'

// Cost per token in fractional cents
const COST_PER_TOKEN_CENTS: Record<ModelTier, { input: number; output: number }> = {
  haiku:  { input: 0.00008, output: 0.0004  },
  sonnet: { input: 0.0003,  output: 0.0015  },
}

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  return new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

function monthlyKey(): string {
  const now = new Date()
  return `budget:monthly:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function dailyKey(): string {
  const now = new Date()
  return `budget:daily:${now.toISOString().slice(0, 10)}`
}

function estimateCostCents(
  inputTokens: number,
  outputTokens: number,
  modelTier: ModelTier,
): number {
  const rates = COST_PER_TOKEN_CENTS[modelTier]
  return inputTokens * rates.input + outputTokens * rates.output
}

function alertLevel(monthlyCents: number): BudgetAlertLevel {
  const fraction = monthlyCents / MONTHLY_BUDGET_CENTS
  if (fraction >= THRESHOLDS.throttle) return 'throttle'
  if (fraction >= THRESHOLDS.review)   return 'review'
  if (fraction >= THRESHOLDS.warning)  return 'warning'
  return 'ok'
}

/**
 * Record API spend for a single generateLetter() call.
 * Updates Redis counters and logs an alert if a threshold is crossed.
 * Non-blocking — caller should .catch(() => {}) to prevent budget errors
 * from disrupting letter delivery.
 */
export async function recordApiSpend(params: {
  inputTokens:  number
  outputTokens: number
  modelTier:    ModelTier
  letterType:   string
}): Promise<BudgetAlertLevel> {
  const redis = getRedisClient()
  if (!redis) {
    // Redis not configured — skip silently (acceptable in local dev / tests)
    return 'ok'
  }

  const costCents = estimateCostCents(params.inputTokens, params.outputTokens, params.modelTier)

  const mKey = monthlyKey()
  const dKey = dailyKey()

  // Increment counters; set 35-day TTL on monthly key, 2-day TTL on daily key
  const [newMonthly] = await Promise.all([
    redis.incrbyfloat(mKey, costCents),
    redis.incrbyfloat(dKey, costCents),
    redis.expire(mKey, 60 * 60 * 24 * 35),
    redis.expire(dKey, 60 * 60 * 24 * 2),
  ])

  const level = alertLevel(newMonthly)
  const pct   = Math.round((newMonthly / MONTHLY_BUDGET_CENTS) * 100)

  // MA-COST-001: Tripwire alerts — Phase 2 replace with n8n webhook
  if (level === 'throttle') {
    console.error(
      `[BUDGET:THROTTLE] 🚨 Monthly API spend at ${pct}% ($${(newMonthly / 100).toFixed(2)}) — ` +
      `LIMIT HIT. Non-essential AI features should be disabled. ` +
      `Tool: ${params.letterType}, model: ${params.modelTier}`,
    )
  } else if (level === 'review') {
    console.warn(
      `[BUDGET:REVIEW] ⚠️  Monthly API spend at ${pct}% ($${(newMonthly / 100).toFixed(2)}) — ` +
      `80% threshold crossed. Review spend immediately. ` +
      `Tool: ${params.letterType}, model: ${params.modelTier}`,
    )
  } else if (level === 'warning') {
    console.warn(
      `[BUDGET:WARNING] Monthly API spend at ${pct}% ($${(newMonthly / 100).toFixed(2)}) — ` +
      `50% threshold crossed. Tool: ${params.letterType}, model: ${params.modelTier}`,
    )
  }

  return level
}

/**
 * Check current budget status without recording spend.
 * Useful for health checks or admin dashboards.
 */
export async function getBudgetStatus(): Promise<{
  monthlyCents:  number
  dailyCents:    number
  monthlyBudget: number
  pctUsed:       number
  alertLevel:    BudgetAlertLevel
}> {
  const redis = getRedisClient()
  if (!redis) {
    return { monthlyCents: 0, dailyCents: 0, monthlyBudget: MONTHLY_BUDGET_CENTS, pctUsed: 0, alertLevel: 'ok' }
  }

  const [rawMonthly, rawDaily] = await Promise.all([
    redis.get<string>(monthlyKey()),
    redis.get<string>(dailyKey()),
  ])

  const monthlyCents = parseFloat(rawMonthly ?? '0') || 0
  const dailyCents   = parseFloat(rawDaily   ?? '0') || 0

  return {
    monthlyCents,
    dailyCents,
    monthlyBudget: MONTHLY_BUDGET_CENTS,
    pctUsed:       Math.round((monthlyCents / MONTHLY_BUDGET_CENTS) * 100),
    alertLevel:    alertLevel(monthlyCents),
  }
}
