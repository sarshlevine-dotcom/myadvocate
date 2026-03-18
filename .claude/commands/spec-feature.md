# /spec-feature

Creates a one-page implementation spec before any build begins.

## Usage
/spec-feature [feature name]

## Output Format

Produce a spec with these sections:

### Feature: [name]
**Phase Gate:** State which phase (1/2/3) this belongs in. Reject if it's a Phase 2+ feature and we're in Phase 1.

**One-line description:** What it does, for whom, in one sentence.

**Scope (in):**
- Bullet list of what is included

**Scope (out):**
- Bullet list of what is explicitly excluded

**Dependencies:**
- Other features or infra required before this can ship
- Note if generateLetter() abstraction is required
- Note if trackedExecution() wrapper is required

**Privacy notes:**
- Does this feature touch user PII? If yes: which layer(s) of the four-layer privacy architecture are affected?
- Does the output reach the AI model? If yes: confirm PII scrubber runs before the call.
- Does this feature touch the owner reporting layer? If yes: confirm only aggregated metrics are read, never user records.

**Schema changes:**
- New tables, columns, or RLS policies required
- If none: state "No schema changes"

**YMYL tier:**
- Tier 1 (attorney + nurse review), Tier 2 (nurse review), or Tier 3 (no clinical review required)
- If Tier 1 or 2: Kate review must be scheduled before publish gate

**Test cases:**
1. Happy path
2. PII scrubber fires correctly (if applicable)
3. Edge case: [describe the most likely failure mode]

**Launch gate:**
- What must be true before this ships? (tests passing, attorney sign-off, trackedExecution() confirmed, etc.)

**Estimated complexity:** XS / S / M / L / XL

---
## MyAdvocate Rules This Command Enforces
- No Phase 2 features in Phase 1. Hard stop.
- generateLetter() abstraction required before any AI output ships
- trackedExecution() required on all 6 canonical functions — launch blocker
- YMYL tier assigned before any content or AI output is built
- Four-layer privacy review on every feature that touches user data
