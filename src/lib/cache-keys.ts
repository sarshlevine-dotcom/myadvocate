/**
 * Redis Cache Key Conventions — MA-IMPL-005 (Caching Execution Pack V3)
 *
 * Key format: ma:cache:{type}:{key}:{modifier}
 *
 * Rules:
 * - No PII in any key component — ever
 * - All segments lowercase, hyphen-separated
 * - Legal/clinical content keys include version suffix for invalidation
 * - TTL constants are in seconds
 *
 * IMPORTANT (MA-COST-001 Bucket 2/3 rule):
 * These keys are ONLY for Bucket 2 (cache-first) and Bucket 3 (static/template) functions.
 * Never cache Bucket 1 (personalized letter output) — these are 1:1 user-to-output.
 */

export const CACHE_KEYS = {
  // Denial code explanations — Bucket 3 (static, no AI)
  denialCode: (code: string) => `ma:cache:denial-code:${code.toLowerCase()}`,

  // Patient rights summaries by state — Bucket 2 (cache-first AI)
  patientRights: (state: string) => `ma:cache:patient-rights:${state.toLowerCase()}:v1`,

  // Billing explainer by code pair — Bucket 2
  billingExplainer: (cptCode: string) => `ma:cache:billing-explainer:${cptCode.toLowerCase()}:v1`,

  // Complaint routing by state + issue type — Bucket 2
  complaintRoute: (state: string, issueType: string) =>
    `ma:cache:complaint-route:${state.toLowerCase()}:${issueType.toLowerCase()}`,

  // Resource routes by state — Bucket 3
  resourceRoute: (state: string) => `ma:cache:resource-route:${state.toLowerCase()}`,

  // FAQ content blocks — Bucket 3
  faqBlock: (slug: string) => `ma:cache:faq:${slug.toLowerCase()}`,
} as const;

/**
 * TTL values in seconds.
 * Legal/clinical content gets shorter TTL to ensure freshness after attorney review.
 */
export const CACHE_TTL = {
  /** 7 days — stable administrative data (denial codes, resource routes) */
  STATIC: 60 * 60 * 24 * 7,

  /** 24 hours — state rights summaries, billing explainers (may change with law updates) */
  LEGAL_CONTENT: 60 * 60 * 24,

  /** 1 hour — complaint routing (payer/state data changes more frequently) */
  DYNAMIC: 60 * 60,

  /** 15 minutes — anything tagged needs_review or freshness-sensitive */
  SHORT: 60 * 15,
} as const;

/**
 * Cache eligibility check.
 * Returns true only for Bucket 2 and Bucket 3 functions.
 * Bucket 1 (personalized letter output) is never eligible.
 */
export function isCacheEligible(functionName: string): boolean {
  const CACHE_ELIGIBLE_FUNCTIONS = [
    "explainDenialCode",
    "getPatientRights",
    "routeComplaint",
    "getBillingExplainer",
    "getResourceRoute",
    "getFaqBlock",
  ] as const;
  return CACHE_ELIGIBLE_FUNCTIONS.includes(functionName as never);
}
