#!/usr/bin/env npx tsx
// scripts/validate-content-db.ts
// MA-CMS-001 — Content items DB validation (H1-07)
//
// Queries all content_items rows where status != 'active' (not yet published),
// runs structural + business-rule validation against each row, and prints a
// human-readable report.
//
// Usage:
//   npx tsx scripts/validate-content-db.ts
//   npx tsx scripts/validate-content-db.ts --all        # include active rows too
//   npx tsx scripts/validate-content-db.ts --json       # machine-readable JSON output
//
// Exit codes:
//   0 = all rows passed
//   1 = one or more violations found (CI-friendly)
//   2 = runtime error (DB unreachable, missing env vars)
//
// Env vars (from .env.local or process environment):
//   NEXT_PUBLIC_SUPABASE_URL  or  SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Read-only: this script only issues SELECT queries.  No mutations.

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import {
  validateContentItem,
  buildReport,
  formatReport,
  type ContentItemRow,
} from '../src/lib/content-item-validator'

// ─── Load env ────────────────────────────────────────────────────────────────
// Try .env.local first (local dev), then .env (CI / Docker)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  ''

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'ERROR: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set.\n' +
    'Copy .env.example to .env.local and fill in values.',
  )
  process.exit(2)
}

// ─── Flags ───────────────────────────────────────────────────────────────────
const INCLUDE_ALL  = process.argv.includes('--all')
const JSON_OUTPUT  = process.argv.includes('--json')

// ─── Main ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // ── 1. Fetch content_items ───────────────────────────────────────────────
  let query = supabase
    .from('content_items')
    .select(
      'id, slug, title_working, summary, pillar, content_type, ' +
      'source_asset_type, source_asset_id, ymyl_tier, status',
    )
    .order('created_at', { ascending: true })

  if (!INCLUDE_ALL) {
    // Default: skip rows that are already 'active' (live/published)
    query = query.neq('status', 'active')
  }

  const { data: rows, error: rowErr } = await query

  if (rowErr) {
    console.error('ERROR: Failed to fetch content_items:', rowErr.message)
    process.exit(2)
  }

  if (!rows || rows.length === 0) {
    console.log('\nNo content_items rows found to validate.\n')
    process.exit(0)
  }

  // ── 2. Prefetch all denial codes (bulk — avoids N+1) ─────────────────────
  const { data: denialCodeRows, error: dcErr } = await supabase
    .from('denial_codes')
    .select('code')

  if (dcErr) {
    console.error('ERROR: Failed to fetch denial_codes:', dcErr.message)
    process.exit(2)
  }

  const validDenialCodes = new Set<string>(
    (denialCodeRows ?? []).map((r: { code: string }) => r.code.toUpperCase()),
  )

  // ── 3. Run validation ─────────────────────────────────────────────────────
  const contentRows = rows as unknown as ContentItemRow[]
  const report = buildReport(contentRows, validDenialCodes)

  // ── 4. Output ─────────────────────────────────────────────────────────────
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(formatReport(report))
  }

  // ── 5. Exit code ──────────────────────────────────────────────────────────
  process.exit(report.failCount > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(2)
})
