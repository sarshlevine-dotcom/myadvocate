// scripts/import-denial-codes.ts
// Idempotent upsert runner for CARC denial codes seed data.
// Usage: npx tsx scripts/import-denial-codes.ts [--dry-run] [--category=<name>]
//
// Preserve-on-update rule: only overwrites a DB field if the current value is NULL.
// Human-enriched content (e.g. Kate-approved appeal_angle) is never overwritten.

import { createClient } from '@supabase/supabase-js'
import { DENIAL_CODES_SEED } from './data/denial-codes-seed'

// ─── Parse flags ──────────────────────────────────────────────────────────────
const DRY_RUN  = process.argv.includes('--dry-run')
const CAT_FLAG = process.argv.find(a => a.startsWith('--category='))
const CATEGORY = CAT_FLAG ? CAT_FLAG.split('=')[1] : null

// ─── Supabase client ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  console.error('Copy .env.example to .env.local and fill in values, then: source .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── Counters ────────────────────────────────────────────────────────────────
let inserted = 0
let updated  = 0
let skipped  = 0
let errors   = 0

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // Deduplicate by code — keep first occurrence (seed file may have duplicates)
  const deduped = Array.from(
    DENIAL_CODES_SEED.reduce((map, r) => {
      if (!map.has(r.code)) map.set(r.code, r)
      return map
    }, new Map<string, typeof DENIAL_CODES_SEED[0]>()).values()
  )
  const dupCount = DENIAL_CODES_SEED.length - deduped.length

  // Filter by category if requested
  const records = CATEGORY
    ? deduped.filter(r => r.category === CATEGORY)
    : deduped

  console.log(`\nMyAdvocate — Denial Codes Import`)
  console.log(`   Mode:     ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`)
  console.log(`   Category: ${CATEGORY ?? 'all'}`)
  console.log(`   Records:  ${records.length} to process (${DENIAL_CODES_SEED.length} in seed file)\n`)
  if (dupCount > 0) {
    console.log(`   NOTE: ${dupCount} duplicate code(s) in seed file removed (first occurrence kept).`)
  }

  if (records.length === 0) {
    console.log(`No records found for category '${CATEGORY}'. Valid categories: check DenialCodeCategory type.`)
    process.exit(0)
  }

  // Fetch all existing codes in one query to avoid N+1
  const { data: existing, error: fetchErr } = await supabase
    .from('denial_codes')
    .select('code, common_causes, appeal_angle, related_codes, tool_cta_id, review_status')

  if (fetchErr) {
    console.error('ERROR: Failed to fetch existing codes:', fetchErr.message)
    process.exit(1)
  }

  const existingMap = new Map((existing ?? []).map(r => [r.code, r]))

  for (const record of records) {
    const existingRecord = existingMap.get(record.code)

    if (!existingRecord) {
      // New record — insert
      if (DRY_RUN) {
        console.log(`  [DRY] INSERT ${record.code} (${record.category})`)
        inserted++
        continue
      }

      const { error } = await supabase.from('denial_codes').insert({
        code:                       record.code,
        category:                   record.category,
        plain_language_explanation: record.plain_language_explanation,
        recommended_action:         record.recommended_action,
        source:                     record.source,
        common_causes:              record.common_causes,
        appeal_angle:               record.appeal_angle,
        related_codes:              record.related_codes,
        tool_cta_id:                record.tool_cta_id,
        review_status:              record.review_status,
      })

      if (error) {
        console.error(`  ERROR inserting ${record.code}:`, error.message)
        errors++
      } else {
        inserted++
      }

    } else {
      // Existing record — apply preserve-on-update rule:
      // Only update fields that are currently NULL in the DB.
      const updates: Record<string, unknown> = {}

      if (existingRecord.common_causes === null && record.common_causes !== null)
        updates.common_causes = record.common_causes
      if (existingRecord.appeal_angle === null && record.appeal_angle !== null)
        updates.appeal_angle = record.appeal_angle
      if (existingRecord.related_codes === null && record.related_codes !== null)
        updates.related_codes = record.related_codes
      if (existingRecord.tool_cta_id === null && record.tool_cta_id !== null)
        updates.tool_cta_id = record.tool_cta_id

      if (Object.keys(updates).length === 0) {
        skipped++
        continue
      }

      if (DRY_RUN) {
        console.log(`  [DRY] UPDATE ${record.code} — fields: ${Object.keys(updates).join(', ')}`)
        updated++
        continue
      }

      const { error } = await supabase
        .from('denial_codes')
        .update(updates)
        .eq('code', record.code)

      if (error) {
        console.error(`  ERROR updating ${record.code}:`, error.message)
        errors++
      } else {
        updated++
      }
    }
  }

  console.log(`\n✓ inserted: ${inserted} | updated: ${updated} | skipped: ${skipped} | errors: ${errors}\n`)

  if (errors > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
