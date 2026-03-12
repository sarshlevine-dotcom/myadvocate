#!/usr/bin/env npx ts-node
// MA-EEAT-001 — Content validation CLI
//
// Runs the 5-layer EEAT safety stack against a content page JSON file.
// Use this before submitting any page to the human review queue.
//
// Usage:
//   npx ts-node scripts/validate-content.ts <path-to-page.json>
//   npx ts-node scripts/validate-content.ts content/denial-codes/co-50.json
//
// The JSON file must conform to ContentPageSchema (src/types/domain.ts).
// A FAIL result means the page must return to drafting — do not submit for review.
//
// Phase 2: when n8n activates, it calls validateEEAT() from src/lib/eeat-validator.ts
// directly as a workflow node. This CLI wrapper is the interim interface.

import fs from 'fs'
import path from 'path'
import { validateEEAT, formatValidationReport } from '../src/lib/eeat-validator'
import type { ContentPageSchema } from '../src/types/domain'

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
EEAT Content Validator — MA-EEAT-001

Usage:
  npx ts-node scripts/validate-content.ts <path-to-page.json>

Options:
  --json    Output raw JSON result (for programmatic use)
  --help    Show this help

Example:
  npx ts-node scripts/validate-content.ts content/denial-codes/co-50.json

The input JSON must include these required fields (ContentPageSchema):
  title, meta_description, content_tier (1|2|3), target_problem, cluster,
  primary_source_1, primary_source_2, reviewer_name, review_date,
  last_updated_date, medical_disclaimer_included, forbidden_claims_check,
  attorney_review_required, publish_approved_by, body

Exit codes:
  0 = PASS (all 5 layers passed — ready for human review queue)
  1 = FAIL (one or more layers failed — return to drafting)
  2 = Error (could not read or parse file)
`)
    process.exit(0)
  }

  const jsonFlag = args.includes('--json')
  const filePath = args.find(a => !a.startsWith('--'))

  if (!filePath) {
    console.error('Error: no input file specified')
    process.exit(2)
  }

  const absolutePath = path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: file not found: ${absolutePath}`)
    process.exit(2)
  }

  let page: Partial<ContentPageSchema>
  try {
    const raw = fs.readFileSync(absolutePath, 'utf-8')
    page = JSON.parse(raw) as Partial<ContentPageSchema>
  } catch (err) {
    console.error(`Error: could not parse JSON from ${absolutePath}`)
    console.error(err)
    process.exit(2)
  }

  // Run the 5-layer validator
  const result = validateEEAT(page)

  if (jsonFlag) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(formatValidationReport(result, page.title ?? filePath))
  }

  // Exit 0 = PASS, 1 = FAIL
  process.exit(result.pass ? 0 : 1)
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(2)
})
