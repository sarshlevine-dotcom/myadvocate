// MA-SEC-002 P15: Persistent rate limiting using Upstash Redis
// Replace the in-memory placeholder in generate/route.ts

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Credentials use ?? '' so module load never throws during `next build`.
// Actual Redis calls fail at .limit() time if credentials are missing in production —
// the correct place to surface the error (MA-SEC-002 P15).
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL   ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
})

// 10 letter generations per user per day
export const generateRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 d'),
  analytics: true,
  prefix: 'myadvocate:generate',
})

// 30 API requests per minute for general endpoints
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
  prefix: 'myadvocate:api',
})
