/**
 * Content item validation rules (H1-07 — MA-CMS-001)
 *
 * Pure functions — no Supabase, no I/O.
 * Called by scripts/validate-content-db.ts and testable in isolation.
 *
 * Adapted to the real content_items schema (migration 024):
 *   - title_working (not "title")
 *   - status        (not "release_state") — enum: idea|queued|drafted|in_review|approved|active|archived
 *   - summary       — checked as body analog for content-ready states
 *   - source_asset_id — denial_code ref when source_asset_type = 'denial_code'
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal shape of a content_items row used for validation. */
export interface ContentItemRow {
  id:               string
  slug:             string
  title_working:    string
  summary:          string | null
  pillar:           string
  content_type:     string
  source_asset_type: string
  source_asset_id:  string | null
  ymyl_tier:        number
  status:           string
}

export interface RowViolation {
  rowId:  string
  field:  string
  rule:   string
  value:  unknown
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Valid values for content_items.status (mirrors the content_item_status DB enum). */
export const KNOWN_STATUS_VALUES: ReadonlySet<string> = new Set([
  'idea',
  'queued',
  'drafted',
  'in_review',
  'approved',
  'active',
  'archived',
])

/**
 * Known content type values.
 * content_items.content_type is a free-text column — this is the application-level
 * allowlist.  Add new types here as the content taxonomy grows.
 */
export const KNOWN_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'article',
  'guide',
  'checklist',
  'template',
  'tool_explainer',
  'faq',
  'denial_code_explainer',
  'blog_post',
  'landing_page',
  'explainer',
  'how_to',
  'overview',
])

/**
 * Slug format: lowercase alphanumeric + hyphens.
 * Must start and end with alphanumeric.  No spaces, underscores, dots, or uppercase.
 * Single-character slugs ('a') are valid.
 */
export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

/**
 * States that require a non-empty summary of at least 100 chars.
 * Early-stage items (idea, queued, archived) may not have body copy yet.
 */
const CONTENT_READY_STATES: ReadonlySet<string> = new Set([
  'drafted',
  'in_review',
  'approved',
  'active',
])

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * Validate a single content_items row.
 *
 * @param row              - Row data from the DB.
 * @param validDenialCodes - Uppercased denial code values from denial_codes table.
 *                           Used to verify source_asset_id references when
 *                           source_asset_type = 'denial_code'.
 * @returns Array of violations.  Empty = row is valid.
 */
export function validateContentItem(
  row: ContentItemRow,
  validDenialCodes: ReadonlySet<string>,
): RowViolation[] {
  const violations: RowViolation[] = []

  // ── title_working: 10–100 chars ──────────────────────────────────────────
  const titleLen = row.title_working?.trim().length ?? 0
  if (titleLen < 10) {
    violations.push({
      rowId: row.id,
      field: 'title_working',
      rule:  'min_10_chars',
      value: row.title_working,
    })
  } else if (titleLen > 100) {
    violations.push({
      rowId: row.id,
      field: 'title_working',
      rule:  'max_100_chars',
      value: titleLen,
    })
  }

  // ── slug: lowercase, hyphens only, no spaces/underscores ─────────────────
  if (!row.slug || !SLUG_PATTERN.test(row.slug)) {
    violations.push({
      rowId: row.id,
      field: 'slug',
      rule:  'invalid_format',
      value: row.slug,
    })
  }

  // ── content_type: known enum value ───────────────────────────────────────
  if (!row.content_type || !KNOWN_CONTENT_TYPES.has(row.content_type)) {
    violations.push({
      rowId: row.id,
      field: 'content_type',
      rule:  'unknown_value',
      value: row.content_type,
    })
  }

  // ── status: known enum value ─────────────────────────────────────────────
  if (!row.status || !KNOWN_STATUS_VALUES.has(row.status)) {
    violations.push({
      rowId: row.id,
      field: 'status',
      rule:  'unknown_value',
      value: row.status,
    })
  }

  // ── summary: non-empty, >= 100 chars for content-ready states ────────────
  if (CONTENT_READY_STATES.has(row.status)) {
    const summaryLen = row.summary?.trim().length ?? 0
    if (summaryLen < 100) {
      violations.push({
        rowId: row.id,
        field: 'summary',
        rule:  'min_100_chars_for_content_states',
        value: summaryLen,
      })
    }
  }

  // ── denial_code reference: exists in denial_codes table ──────────────────
  if (row.source_asset_type === 'denial_code') {
    if (!row.source_asset_id) {
      violations.push({
        rowId: row.id,
        field: 'source_asset_id',
        rule:  'denial_code_required_when_source_type_is_denial_code',
        value: null,
      })
    } else if (!validDenialCodes.has(row.source_asset_id.toUpperCase())) {
      violations.push({
        rowId: row.id,
        field: 'source_asset_id',
        rule:  'denial_code_not_found',
        value: row.source_asset_id,
      })
    }
  }

  return violations
}

// ─── Report builder ───────────────────────────────────────────────────────────

export interface ValidationReport {
  totalChecked: number
  passCount:    number
  failCount:    number
  violations:   Array<{ rowId: string; violations: RowViolation[] }>
}

/** Aggregate per-row results into a summary report. */
export function buildReport(
  rows: ContentItemRow[],
  validDenialCodes: ReadonlySet<string>,
): ValidationReport {
  const allViolations: Array<{ rowId: string; violations: RowViolation[] }> = []

  for (const row of rows) {
    const v = validateContentItem(row, validDenialCodes)
    if (v.length > 0) {
      allViolations.push({ rowId: row.id, violations: v })
    }
  }

  const failCount = allViolations.length
  return {
    totalChecked: rows.length,
    passCount:    rows.length - failCount,
    failCount,
    violations:   allViolations,
  }
}

/** Format a ValidationReport as a human-readable CLI string. */
export function formatReport(report: ValidationReport): string {
  const lines: string[] = []

  lines.push('')
  lines.push('MyAdvocate — Content Items Validation Report')
  lines.push('─'.repeat(50))
  lines.push(`  Rows checked : ${report.totalChecked}`)
  lines.push(`  Passed       : ${report.passCount}`)
  lines.push(`  Failed       : ${report.failCount}`)
  lines.push('')

  if (report.violations.length === 0) {
    lines.push('  ✓ All rows passed validation.')
  } else {
    lines.push('  Violations:')
    lines.push('')
    for (const { rowId, violations } of report.violations) {
      lines.push(`  Row ${rowId}`)
      for (const v of violations) {
        const valueStr = v.value === null ? 'null' : String(v.value)
        lines.push(`    ✗ ${v.field} — ${v.rule} (value: ${valueStr.slice(0, 80)})`)
      }
      lines.push('')
    }
  }

  lines.push('─'.repeat(50))
  lines.push('')
  return lines.join('\n')
}
