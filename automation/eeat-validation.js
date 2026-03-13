/**
 * automation/eeat-validation.js — MyAdvocate EEAT Validation Automation
 * MA-EEAT-001
 *
 * Scans content_drafts/ for articles with status: draft_complete and
 * eeat_validated: false. Runs each one through the 5-layer EEAT automated
 * safety stack. Updates frontmatter on pass. Writes a structured failure
 * report on any that don't pass. Updates context_registry/content_pages.json.
 *
 * Usage:
 *   node automation/eeat-validation.js        — run once (manual / cron)
 *
 * Schedule: runs daily at 10:00 AM (1 hour after content generation at 9 AM)
 *
 * Hard constraints:
 *   - NEVER sets publish_ready: true — that flag is never touched
 *   - NEVER modifies article body content — only updates frontmatter flags
 *   - NEVER deletes any file, even on validation failure
 *   - Failure reports written to content_drafts/validation_failures/
 *
 * Governing spec: MA-EEAT-001 (docs/seo/)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ─── Paths ────────────────────────────────────────────────────────────────────
const REPO_ROOT          = path.join(__dirname, '..');
const CONTENT_DRAFTS_DIR = path.join(REPO_ROOT, 'content_drafts');
const CONTENT_PAGES_JSON = path.join(REPO_ROOT, 'context_registry', 'content_pages.json');
const FAILURES_DIR       = path.join(CONTENT_DRAFTS_DIR, 'validation_failures');

// ─── Layer 1: Required frontmatter fields ─────────────────────────────────────
const REQUIRED_FIELDS = [
  'page_id',
  'publish_sequence',
  'status',
  'tier',
  'cluster_id',
  'tool_route',
  'review_level',
  'brand_stat_required',
  'target_keyword',
  'meta_description',
  'forbidden_claims_check',
  'disclaimer_present',
];

// ─── Layer 3: Forbidden claim patterns ───────────────────────────────────────
// Each entry: { pattern: RegExp, label: string }
const FORBIDDEN_PATTERNS = [
  { pattern: /you should sue/i,               label: '"you should sue"' },
  { pattern: /consider litigation/i,          label: '"consider litigation"' },
  { pattern: /\blegal action\b/i,             label: '"legal action"' },
  { pattern: /this was illegal/i,             label: '"this was illegal"' },
  { pattern: /they broke the law/i,           label: '"they broke the law"' },
  { pattern: /violated the law/i,             label: '"violated the law"' },
  { pattern: /you have a case\b/i,            label: '"you have a case"' },
  { pattern: /you have legal grounds/i,       label: '"you have legal grounds"' },
  { pattern: /\blegal claim\b/i,              label: '"legal claim"' },
  { pattern: /you will win/i,                 label: '"you will win"' },
  { pattern: /your appeal will succeed/i,     label: '"your appeal will succeed"' },
  { pattern: /\bguaranteed\b/i,               label: '"guaranteed"' },
  {
    pattern: /\$[\d,]+(?:\.\d{2})?\s*(?:settlement|recovery|recovered|awarded|won)/i,
    label: 'dollar amount described as settlement or recovery value',
  },
  {
    pattern: /(?:settlement|recovery)\s+(?:value\s+)?(?:of\s+)?\$[\d,]+/i,
    label: 'dollar amount described as settlement or recovery value',
  },
  { pattern: /MyAdvocate is your lawyer/i,    label: '"MyAdvocate is your lawyer"' },
  { pattern: /acting as your attorney/i,      label: '"acting as your attorney"' },
];

// ─── Layer 2: Authoritative source domains ────────────────────────────────────
const AUTHORITATIVE_DOMAIN_PATTERNS = [
  /cms\.gov/i,
  /hhs\.gov/i,
  /kff\.org/i,
  /oig\.hhs\.gov/i,
  /insurance\.[a-z]{2}\.gov/i,   // state insurance commissioner domains
];

// ─── Layer 4: Required disclaimer text ───────────────────────────────────────
const REQUIRED_DISCLAIMER =
  'The information in this article is for educational and advocacy purposes only. ' +
  'MyAdvocate does not provide legal or medical advice.';

// ─── Layer 5: Clinical claim patterns ────────────────────────────────────────
// A "clinical claim" is present if the body mentions a specific medical
// condition, treatment, drug, or diagnostic test by name.
const CLINICAL_PATTERNS = [
  // Conditions
  /\b(diabetes|cancer|hypertension|asthma|COPD|heart failure|kidney disease|renal failure|depression|anxiety|schizophrenia|bipolar|stroke|Alzheimer|Parkinson|HIV|AIDS|hepatitis|cirrhosis|arthritis|osteoporosis|fibromyalgia|lupus|multiple sclerosis|Crohn|colitis|celiac|epilepsy|seizure|neuropathy|dementia)\b/i,
  // Procedures / Diagnostics
  /\b(chemotherapy|radiation therapy|immunotherapy|dialysis|transplant|biopsy|MRI|CT scan|X-ray|ultrasound|colonoscopy|endoscopy|angioplasty|stent|pacemaker|laparoscopy|appendectomy|mastectomy|hysterectomy)\b/i,
  // Drugs
  /\b(metformin|insulin|lisinopril|atorvastatin|omeprazole|amlodipine|levothyroxine|metoprolol|sertraline|fluoxetine|amoxicillin|prednisone|warfarin|ibuprofen|acetaminophen|oxycodone|hydrocodone|benzodiazepine)\b/i,
  // Clinical framing
  /\b(ICD-10|CPT code|medical necessity criteria|clinical criteria|treatment protocol|dosage|prescribed medication|diagnostic test)\b/i,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively collect all .md files under a directory.
 */
function collectMarkdownFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip the validation_failures output directory
      if (entry.name === 'validation_failures') continue;
      results = results.concat(collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Parse a Markdown file into { frontmatter, body, rawFrontmatter }.
 * Returns null if the file has no YAML frontmatter block.
 */
function parseMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  // YAML frontmatter must start at line 1 with ---
  if (!raw.startsWith('---')) return null;

  const end = raw.indexOf('\n---', 3);
  if (end === -1) return null;

  const rawFm  = raw.slice(3, end).trim();
  const body   = raw.slice(end + 4).trim();
  let frontmatter;
  try {
    frontmatter = yaml.load(rawFm);
  } catch (e) {
    return null;
  }
  return { frontmatter, body, rawFrontmatter: rawFm, raw };
}

/**
 * Rewrite only the frontmatter of a file, leaving the body untouched.
 * Merges `updates` into the existing frontmatter object.
 *
 * CONSTRAINT: never touches publish_ready or article body.
 */
function updateFrontmatter(filePath, updates) {
  const parsed = parseMarkdownFile(filePath);
  if (!parsed) throw new Error(`Cannot parse frontmatter in ${filePath}`);

  const { frontmatter, body, raw } = parsed;

  // Safety check — never allow publish_ready to be touched
  if ('publish_ready' in updates) {
    throw new Error('updateFrontmatter: publish_ready is not permitted to be updated');
  }

  const updated = Object.assign({}, frontmatter, updates);

  // Reconstruct YAML block preserving key order — put updates at top
  // We use yaml.dump with sortKeys: false to preserve insertion order where possible
  const newFm   = yaml.dump(updated, { lineWidth: 120, quotingType: '"', forceQuotes: false });
  const newFile = `---\n${newFm}---\n\n${body}\n`;

  fs.writeFileSync(filePath, newFile, 'utf-8');
}

/**
 * Extract a context snippet around the first match of a pattern in text.
 * Returns the matched line (or nearby lines) for the failure report.
 */
function extractSnippet(text, pattern) {
  const match = pattern.exec(text);
  if (!match) return null;
  const idx   = match.index;
  const start = Math.max(0, idx - 60);
  const end   = Math.min(text.length, idx + match[0].length + 60);
  return `"…${text.slice(start, end).replace(/\n/g, ' ').trim()}…"`;
}

// ─── The 5-Layer EEAT Validator ───────────────────────────────────────────────

/**
 * Run all 5 layers.
 * Returns { pass: boolean, layers: [{ layer, pass, failures: [{label, snippet, fix}] }] }
 */
function runEEATValidation(frontmatter, body) {
  const layers = [];

  // ── Layer 1: Schema ──────────────────────────────────────────────────────
  {
    const missing = REQUIRED_FIELDS.filter(
      (f) => frontmatter[f] === undefined || frontmatter[f] === null || frontmatter[f] === '',
    );
    const failures = missing.map((f) => ({
      label: `Missing required field: "${f}"`,
      snippet: null,
      fix: `Add "${f}:" with a valid value to the frontmatter.`,
    }));
    layers.push({ layer: 1, name: 'Schema', pass: failures.length === 0, failures });
  }

  // ── Layer 2: Citations ───────────────────────────────────────────────────
  {
    const failures = [];
    if (frontmatter.brand_stat_required === true) {
      const first300 = body.split(/\s+/).slice(0, 300).join(' ');

      // Check for the brand stat
      const hasStat =
        /fewer than 1%/i.test(first300) ||
        /1 in 5/i.test(first300);
      if (!hasStat) {
        failures.push({
          label: 'Missing brand stat ("fewer than 1%" or "1 in 5") in first 300 words',
          snippet: null,
          fix:
            'Add "fewer than 1% of patients ever appeal" or "1 in 5 claims are denied" within the first 300 words of the article body.',
        });
      }

      // Check for KFF citation with year reference
      const hasKFF = /KFF/i.test(body) && /through \d{4}/i.test(body);
      if (!hasKFF) {
        const kffSnippet = extractSnippet(body, /KFF/i);
        failures.push({
          label: 'Missing KFF citation with year reference (e.g. "through 2023")',
          snippet: kffSnippet,
          fix:
            'Add a citation to KFF with a year reference, e.g. "KFF analysis of Healthcare.gov data through 2023".',
        });
      }

      // Check for at least one authoritative external link
      const hasAuthLink = AUTHORITATIVE_DOMAIN_PATTERNS.some((p) => p.test(body));
      if (!hasAuthLink) {
        failures.push({
          label:
            'No link to an authoritative source (cms.gov, hhs.gov, kff.org, oig.hhs.gov, or state insurance commissioner domain)',
          snippet: null,
          fix:
            'Add at least one hyperlink to an authoritative government or KFF source in the article body.',
        });
      }
    }
    layers.push({ layer: 2, name: 'Citations', pass: failures.length === 0, failures });
  }

  // ── Layer 3: Forbidden claims ────────────────────────────────────────────
  {
    const failures = [];
    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      if (pattern.test(body)) {
        const snippet = extractSnippet(body, new RegExp(pattern.source, pattern.flags));
        failures.push({
          label: `Forbidden claim detected: ${label}`,
          snippet,
          fix: `Remove or rephrase the text matching ${label}. Do not imply legal action, litigation, guaranteed outcomes, or that MyAdvocate is acting as legal counsel.`,
        });
      }
    }
    layers.push({ layer: 3, name: 'Forbidden Claims', pass: failures.length === 0, failures });
  }

  // ── Layer 4: Disclaimer ──────────────────────────────────────────────────
  {
    const failures = [];
    if (!body.includes(REQUIRED_DISCLAIMER)) {
      // Check which part is missing
      const hasEdu  = /for educational and advocacy purposes only/i.test(body);
      const hasNoLegal = /does not provide legal or medical advice/i.test(body);
      let fix = 'Add the exact required disclaimer block to the end of the article:\n\n';
      fix += `    "${REQUIRED_DISCLAIMER}"`;

      let label = 'Required disclaimer block not found or incomplete';
      if (hasEdu && !hasNoLegal) {
        label = 'Disclaimer present but missing "MyAdvocate does not provide legal or medical advice."';
      } else if (!hasEdu && hasNoLegal) {
        label = 'Disclaimer present but missing "for educational and advocacy purposes only"';
      }

      failures.push({ label, snippet: null, fix });
    }
    layers.push({ layer: 4, name: 'Disclaimer', pass: failures.length === 0, failures });
  }

  // ── Layer 5: Tier Routing & Clinical Flag ────────────────────────────────
  {
    const failures = [];
    const { tool_route, review_level, clinical_reviewed } = frontmatter;

    // Tool route checks
    if (tool_route === 'insurance_appeal_generator') {
      if (!/\/auth/.test(body)) {
        failures.push({
          label: 'Missing required link to /auth for insurance_appeal_generator tool route',
          snippet: null,
          fix: 'Add a call-to-action linking to /auth (e.g. "[Write Your Appeal Letter →](/auth)") in the article body.',
        });
      }
    }

    if (tool_route === 'medical_bill_dispute_generator') {
      if (!/\/tools\/denial-decoder/.test(body)) {
        failures.push({
          label: 'Missing required link to /tools/denial-decoder for medical_bill_dispute_generator tool route',
          snippet: null,
          fix: 'Add a call-to-action linking to /tools/denial-decoder in the article body.',
        });
      }
    }

    // Clinical review integrity check
    if (review_level === 'clinical_review_needed') {
      const hasClinicalContent = CLINICAL_PATTERNS.some((p) => p.test(body));
      if (hasClinicalContent && clinical_reviewed === true) {
        failures.push({
          label:
            'clinical_reviewed is set to true on a draft with clinical content — this flag must not be set by the automated pipeline',
          snippet: null,
          fix:
            'Investigate who set clinical_reviewed: true. If it was not set by a human reviewer, reset it to false. The automated validation task never sets this flag.',
        });
      }
    }

    layers.push({ layer: 5, name: 'Tier Routing', pass: failures.length === 0, failures });
  }

  const pass = layers.every((l) => l.pass);
  return { pass, layers };
}

// ─── Failure Report Writer ────────────────────────────────────────────────────

function writeFailureReport(filePath, frontmatter, validationResult, runDate) {
  fs.mkdirSync(FAILURES_DIR, { recursive: true });

  const filename   = path.basename(filePath, '.md');
  const reportPath = path.join(FAILURES_DIR, `${filename}-FAIL.md`);

  const failingLayers = validationResult.layers.filter((l) => !l.pass);

  let report = `# EEAT Validation Failure — ${filename}\n`;
  report += `\n**File:** \`${filePath.replace(REPO_ROOT + '/', '')}\`\n`;
  report += `**Run date:** ${runDate}\n`;
  report += `**page_id:** ${frontmatter.page_id ?? 'unknown'}\n`;
  report += `**status:** ${frontmatter.status}\n`;
  report += `**Layers failed:** ${failingLayers.map((l) => `Layer ${l.layer} (${l.name})`).join(', ')}\n`;
  report += `\n---\n`;

  for (const layer of failingLayers) {
    report += `\n## Layer ${layer.layer}: ${layer.name} — FAIL\n\n`;
    for (const failure of layer.failures) {
      report += `### ❌ ${failure.label}\n\n`;
      if (failure.snippet) {
        report += `**Triggering text:**\n\n> ${failure.snippet}\n\n`;
      }
      report += `**Required fix:** ${failure.fix}\n\n`;
    }
  }

  report += `---\n`;
  report += `\n*This report was generated automatically by \`automation/eeat-validation.js\`.*\n`;
  report += `*Do not manually edit this file — re-run validation after fixing the source article.*\n`;

  fs.writeFileSync(reportPath, report, 'utf-8');
  return reportPath;
}

// ─── Content Pages Registry Updater ──────────────────────────────────────────

function updateContentPagesRegistry(pageId, runDate) {
  if (!fs.existsSync(CONTENT_PAGES_JSON)) {
    console.warn('[eeat-validation] content_pages.json not found — skipping registry update');
    return false;
  }

  const raw      = fs.readFileSync(CONTENT_PAGES_JSON, 'utf-8');
  const registry = JSON.parse(raw);

  const record = registry.records.find((r) => r.id === pageId);
  if (!record) {
    console.warn(`[eeat-validation] No registry record found for page_id: ${pageId} — skipping`);
    return false;
  }

  record.eeat_validated = true;
  record.updated_at     = `${runDate}T00:00:00Z`;

  fs.writeFileSync(CONTENT_PAGES_JSON, JSON.stringify(registry, null, 2) + '\n', 'utf-8');
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const runDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`EEAT Validation Run — ${runDate}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Collect all .md files
  let allFiles;
  try {
    allFiles = collectMarkdownFiles(CONTENT_DRAFTS_DIR);
  } catch (err) {
    console.error(`[eeat-validation] Cannot read content_drafts/ directory: ${err.message}`);
    process.exit(1);
  }

  // Run state
  const results = {
    scanned:          0,
    passed:           [],
    failed:           [],
    alreadyValidated: [],
    skippedNotReady:  [],
    errors:           [],
  };

  for (const filePath of allFiles) {
    const relPath = filePath.replace(REPO_ROOT + '/', '');
    const parsed  = parseMarkdownFile(filePath);

    // Files without YAML frontmatter (e.g. README.md) are not content drafts — skip silently
    if (!parsed) continue;

    const { frontmatter, body } = parsed;

    // Skip if already validated
    if (frontmatter.eeat_validated === true) {
      results.alreadyValidated.push(relPath);
      continue;
    }

    // Skip if not draft_complete
    if (frontmatter.status !== 'draft_complete') {
      results.skippedNotReady.push(relPath);
      continue;
    }

    results.scanned++;
    const pageId = frontmatter.page_id ?? 'unknown';
    const title  = frontmatter.target_keyword ?? path.basename(filePath, '.md');

    console.log(`Validating: ${relPath} (${pageId})`);

    // Run the 5-layer check
    let validationResult;
    try {
      validationResult = runEEATValidation(frontmatter, body);
    } catch (err) {
      results.errors.push({ file: relPath, reason: `Validation error: ${err.message}` });
      console.error(`  ✗ Error during validation: ${err.message}`);
      continue;
    }

    if (validationResult.pass) {
      // ── PASS: update frontmatter + registry ──────────────────────────────
      try {
        updateFrontmatter(filePath, { eeat_validated: true });
        const registryUpdated = updateContentPagesRegistry(pageId, runDate);
        console.log(`  ✓ PASS — frontmatter updated${registryUpdated ? ', registry updated' : ' (registry record not found)'}`);
        results.passed.push({ file: relPath, title });
      } catch (err) {
        results.errors.push({ file: relPath, reason: `Post-pass update failed: ${err.message}` });
        console.error(`  ✗ PASS but update failed: ${err.message}`);
      }
    } else {
      // ── FAIL: write failure report ────────────────────────────────────────
      const failingLayerNames = validationResult.layers
        .filter((l) => !l.pass)
        .map((l) => `Layer ${l.layer} (${l.name})`)
        .join(', ');

      try {
        const reportPath = writeFailureReport(filePath, frontmatter, validationResult, runDate);
        console.log(`  ✗ FAIL [${failingLayerNames}] — report: ${reportPath.replace(REPO_ROOT + '/', '')}`);
        results.failed.push({ file: relPath, title, failingLayers: failingLayerNames });
      } catch (err) {
        results.errors.push({ file: relPath, reason: `Could not write failure report: ${err.message}` });
        console.error(`  ✗ FAIL and could not write report: ${err.message}`);
      }
    }
  }

  // ─── Run Summary ───────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`EEAT Validation Run — ${runDate}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`Files scanned:           ${results.scanned}`);
  console.log(`Passed:                  ${results.passed.length}`);
  console.log(`Failed:                  ${results.failed.length}`);
  console.log(`Already validated (skip): ${results.alreadyValidated.length}`);
  console.log(`Not draft_complete (skip): ${results.skippedNotReady.length}`);

  if (results.passed.length > 0) {
    console.log('\n✓ PASSED:');
    results.passed.forEach((r) => console.log(`  • ${r.title} (${r.file})`));
  }

  if (results.failed.length > 0) {
    console.log('\n✗ FAILED:');
    results.failed.forEach((r) =>
      console.log(`  • ${r.title} (${r.file})\n    Layers: ${r.failingLayers}`),
    );
  }

  if (results.errors.length > 0) {
    console.log('\n⚠ ERRORS (require investigation):');
    results.errors.forEach((e) => console.log(`  • ${e.file}: ${e.reason}`));
  }

  const actionRequired = [...results.failed, ...results.errors];
  if (actionRequired.length > 0) {
    console.log('\n⚑ ACTION REQUIRED (founder attention):');
    actionRequired.forEach((r) =>
      console.log(`  • ${'file' in r ? r.file : r.file}: ${'failingLayers' in r ? r.failingLayers : r.reason}`),
    );
  } else if (results.scanned > 0) {
    console.log('\n✓ All scanned drafts passed — no founder action required.');
  }

  console.log(`${'═'.repeat(60)}\n`);

  // Exit non-zero if there were failures or errors
  process.exit(actionRequired.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[eeat-validation] Unexpected fatal error:', err);
  process.exit(2);
});
