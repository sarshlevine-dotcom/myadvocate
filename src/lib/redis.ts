// src/lib/redis.ts
// L1 hot cache — Upstash Redis singleton for denial code lookups and appeal templates.
// MA-COST-001: Only Bucket 2 (cache-first AI) and Bucket 3 (static/template) functions
// may use this cache. Never cache Bucket 1 (personalized letter output).
//
// SAFETY RULE: Redis errors MUST NOT throw or block the main path.
// On any Redis failure: log the error, return null / return void silently.

import { Redis } from '@upstash/redis'

// Singleton — credentials use ?? '' so module load never throws during `next build`.
// Actual Redis calls fail at call time if credentials are missing in production.
export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL   ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
})

/**
 * Get a cached value by key.
 * Returns null on cache miss OR on any Redis error.
 * NEVER throws — callers must always handle null as a cache miss.
 */
export async function getCache(key: string): Promise<unknown> {
  try {
    return await redis.get(key)
  } catch (err) {
    console.error('[redis] getCache error:', key, err)
    return null
  }
}

/**
 * Set a cached value with TTL.
 * NEVER throws — silently logs and returns on any Redis error.
 */
export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttlSeconds })
  } catch (err) {
    console.error('[redis] setCache error:', key, err)
  }
}
