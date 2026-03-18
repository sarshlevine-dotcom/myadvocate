# /verify-release

Runs release verification before any feature ships.
This command is the gate between "built" and "live."

## Usage
/verify-release [feature or PR name]

## Output Format

### Release Verification: [feature name]

**Pre-flight checklist:**

**Code quality:**
- [ ] Lint passes (no errors)
- [ ] All tests pass
- [ ] No console.log or debug statements in production code
- [ ] No hardcoded API keys, secrets, or credentials

**Privacy:**
- [ ] /review-privacy run and result is PASS or CONDITIONAL PASS (with all conditions met)
- [ ] PII scrubber confirmed on any workflow that calls the AI model
- [ ] No specific diagnoses stored
- [ ] Owner reporting reads aggregated metrics only

**AI / canonical functions:**
- [ ] trackedExecution() confirmed on all canonical functions touched by this PR (launch blocker if missing)
- [ ] Langfuse trace confirmed working for affected functions
- [ ] generateLetter() abstraction in place — no direct API calls from feature code
- [ ] Token count within API cost model for affected workflows

**YMYL:**
- [ ] YMYL tier assigned for any new content or AI output
- [ ] Kate review complete and documented for Tier 1 and Tier 2 content
- [ ] Attorney review complete for Tier 1 content (if applicable)
- [ ] No healthcare content ships without required sign-offs

**Rollback:**
- Rollback plan: [describe how to revert if this causes issues in production]
- Rollback time estimate: [X minutes]
- Monitoring: [what to watch in Google Sheets / Langfuse / n8n for the first 24 hours post-deploy]

**Known risks:**
- List any known edge cases or risks that are acceptable to ship with
- If none: state "No known risks"

**Verdict:**
- SHIP: All checklist items pass
- HOLD: [list blocking items]

**Verified by:** [name] | Date: [date]

---
## MyAdvocate Rules This Command Enforces
- trackedExecution() on all canonical functions — launch blocker, no exceptions
- YMYL review gates must be documented before ship
- Privacy audit must be on file before ship
- Every release has a named rollback plan
- Langfuse tracing confirmed before any canonical function goes live
