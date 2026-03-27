/**
 * MA-ARC-FUNC-001 — Canonical function enforcement
 *
 * Static source-scan tests that enforce two invariants at test-time:
 *
 *   INV-1  No .ts file under src/ other than generate-letter.ts may import
 *          from @anthropic-ai/sdk.  Any other file making a direct Anthropic
 *          call bypasses the 7-gate chain (MA-AUT-006) and the Langfuse trace
 *          wrapper (MA-ARC-FUNC-001).
 *
 *   INV-2  Every CanonicalFunctionName string literal that appears in
 *          generate-letter.ts must be associated with a trackedExecution()
 *          call — either directly as the functionName argument, or through
 *          FUNCTION_NAME_MAP (typed Record<LetterType, CanonicalFunctionName>)
 *          which is the only value passed as functionName to trackedExecution().
 *          This catches any future edit that introduces a raw Anthropic call
 *          alongside a new canonical name without the wrapper.
 *
 * NOTE: CanonicalFunctionName defines 8 values.  Only 4 are currently
 * implemented in generate-letter.ts (generateAppealLetter, generateDisputeLetter,
 * generateHIPAARequest, generateNegotiationScript).  The remaining 4
 * (explainDenialCode, getPatientRights, routeComplaint, generateBillingAnalysis)
 * are Phase 1+ functions not yet wired.  INV-2 is intentionally scoped to names
 * that *appear* in generate-letter.ts so the test passes today and catches any
 * future addition that bypasses the wrapper.
 *
 * These tests scan source files at runtime — they do not import or execute any
 * module under test.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ─── File helpers ─────────────────────────────────────────────────────────────

/** Recursively collect every .ts file under dir (excludes .d.ts). */
function findTsFiles(dir: string): string[] {
  const results: string[] = []

  function walk(d: string): void {
    const entries = fs.readdirSync(d, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        walk(full)
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.d.ts')
      ) {
        results.push(full)
      }
    }
  }

  walk(dir)
  return results
}

/**
 * Parse the CanonicalFunctionName union from tracked-execution.ts.
 * Reads the source file and extracts string literals from the union type body.
 */
function extractCanonicalFunctionNames(repoRoot: string): string[] {
  const trackedExecPath = path.join(repoRoot, 'src', 'lib', 'tracked-execution.ts')
  const content = fs.readFileSync(trackedExecPath, 'utf-8')

  // Match the entire type declaration block
  const match = content.match(/export\s+type\s+CanonicalFunctionName\s*=\s*((?:\s*\|\s*'[^']+'\s*)+)/)
  if (!match) {
    throw new Error(
      'Could not locate CanonicalFunctionName union in tracked-execution.ts — update this regex if the type was renamed or moved',
    )
  }

  const typeBody = match[1]
  const names: string[] = []
  const nameRegex = /'([^']+)'/g
  let m: RegExpExecArray | null
  while ((m = nameRegex.exec(typeBody)) !== null) {
    names.push(m[1])
  }

  if (names.length === 0) {
    throw new Error('CanonicalFunctionName union parsed as empty — review tracked-execution.ts')
  }

  return names
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('canonical-function-enforcement', () => {
  const repoRoot = path.resolve(process.cwd())
  const srcDir   = path.join(repoRoot, 'src')

  // ── INV-1: @anthropic-ai/sdk import restriction ──────────────────────────────

  it(
    'no .ts file under src/ other than generate-letter.ts may import @anthropic-ai/sdk',
    () => {
      const files = findTsFiles(srcDir)

      // Pattern matches both ESM import and CJS require styles
      const sdkImportPattern = /(?:from\s+['"]@anthropic-ai\/sdk['"]|require\s*\(\s*['"]@anthropic-ai\/sdk['"]\s*\))/

      const filesWithSdkImport = files.filter(f => {
        const content = fs.readFileSync(f, 'utf-8')
        return sdkImportPattern.test(content)
      })

      const allowedFile = path.join(repoRoot, 'src', 'lib', 'generate-letter.ts')

      const violations = filesWithSdkImport.filter(f => f !== allowedFile)

      expect(
        violations,
        violations.length > 0
          ? `Files importing @anthropic-ai/sdk that are NOT generate-letter.ts:\n  ${violations.map(f => path.relative(repoRoot, f)).join('\n  ')}\n\nAll Anthropic SDK calls must go through src/lib/generate-letter.ts (MA-ARC-FUNC-001, CLAUDE.md invariant #2).`
          : '',
      ).toHaveLength(0)

      // Sanity guard: if generate-letter.ts ever removes the SDK import, this test
      // would pass vacuously.  Keep it meaningful by asserting the import still exists.
      expect(
        filesWithSdkImport,
        'generate-letter.ts no longer imports @anthropic-ai/sdk — update allowedFile if it was renamed',
      ).toContain(allowedFile)
    },
  )

  // ── INV-2: CanonicalFunctionName literals in generate-letter.ts are all
  //           associated with trackedExecution() ──────────────────────────────

  it(
    'every CanonicalFunctionName string literal in generate-letter.ts is associated with trackedExecution()',
    () => {
      const generateLetterPath = path.join(repoRoot, 'src', 'lib', 'generate-letter.ts')
      const content            = fs.readFileSync(generateLetterPath, 'utf-8')
      const canonicalNames     = extractCanonicalFunctionNames(repoRoot)

      // generate-letter.ts must call trackedExecution() at least once
      const trackedCallCount = (content.match(/await trackedExecution\s*\(/g) ?? []).length
      expect(
        trackedCallCount,
        'generate-letter.ts must call trackedExecution() — bypassing it violates MA-ARC-FUNC-001',
      ).toBeGreaterThanOrEqual(1)

      // FUNCTION_NAME_MAP must be typed as Record<LetterType, CanonicalFunctionName>
      expect(
        content,
        'FUNCTION_NAME_MAP must have type annotation Record<LetterType, CanonicalFunctionName>',
      ).toMatch(/FUNCTION_NAME_MAP[^:]*:\s*Record\s*<\s*LetterType\s*,\s*CanonicalFunctionName\s*>/)

      // The functionName argument passed to trackedExecution() must use FUNCTION_NAME_MAP
      expect(
        content,
        'trackedExecution() must receive functionName via FUNCTION_NAME_MAP[...] to stay type-safe',
      ).toMatch(/functionName\s*:\s*FUNCTION_NAME_MAP\[/)

      // Find canonical names that appear as string literals in this file
      const namesInFile = canonicalNames.filter(name =>
        new RegExp(`'${name}'`).test(content),
      )

      // At least the 4 current letter-type canonical names must be present
      expect(
        namesInFile.length,
        `Expected >= 4 CanonicalFunctionName literals in generate-letter.ts (one per LetterType), found ${namesInFile.length}: [${namesInFile.join(', ')}]`,
      ).toBeGreaterThanOrEqual(4)

      // Locate the FUNCTION_NAME_MAP object literal
      const mapBlockMatch = content.match(
        /const\s+FUNCTION_NAME_MAP[^=]*=\s*\{([\s\S]*?)\}/,
      )

      expect(
        mapBlockMatch,
        'Could not locate FUNCTION_NAME_MAP object literal in generate-letter.ts',
      ).not.toBeNull()

      const mapBlock = mapBlockMatch![1]

      for (const name of namesInFile) {
        // Each canonical name present in the file must live inside FUNCTION_NAME_MAP —
        // the only source of canonical names fed into trackedExecution().
        expect(
          mapBlock,
          `CanonicalFunctionName '${name}' appears in generate-letter.ts but is NOT in FUNCTION_NAME_MAP. ` +
          `Every canonical name used here must flow through FUNCTION_NAME_MAP → trackedExecution() (MA-ARC-FUNC-001).`,
        ).toContain(`'${name}'`)
      }
    },
  )

  // ── INV-2b: The single Anthropic API call is inside trackedExecution ─────────

  it(
    'generate-letter.ts makes Anthropic API calls only inside the trackedExecution() callback',
    () => {
      const generateLetterPath = path.join(repoRoot, 'src', 'lib', 'generate-letter.ts')
      const content            = fs.readFileSync(generateLetterPath, 'utf-8')

      const anthropicCallMatches = content.match(/anthropic\.messages\b/g) ?? []

      // Exactly one Anthropic call is expected
      expect(
        anthropicCallMatches.length,
        `Expected exactly 1 anthropic.messages call in generate-letter.ts, found ${anthropicCallMatches.length}. ` +
        'All Anthropic API calls must go through a single trackedExecution() invocation.',
      ).toBe(1)

      // The Anthropic call must appear after the trackedExecution( opening in the file
      const trackedExecIndex   = content.indexOf('await trackedExecution(')
      const anthropicCallIndex = content.indexOf('anthropic.messages')

      expect(trackedExecIndex, 'await trackedExecution( not found in generate-letter.ts').toBeGreaterThan(-1)

      expect(
        anthropicCallIndex > trackedExecIndex,
        `anthropic.messages appears at char ${anthropicCallIndex}, before trackedExecution( at char ${trackedExecIndex}. ` +
        'The Anthropic call must be inside the trackedExecution() callback.',
      ).toBe(true)
    },
  )
})
