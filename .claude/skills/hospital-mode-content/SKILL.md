# Hospital Mode Content

This skill defines how Hospital Mode pages and state rights summaries must be phrased, cited, and reviewed.
Load this whenever working on Hospital Mode content or getPatientRights().

## Hospital Mode — Phase and Gate
- Hospital Mode is a Phase 3 feature — do NOT build it in Phase 1 or Phase 2
- Rolled out incrementally by state — not nationwide at launch
- Priority states at Phase 3 launch: CA, TX, NY (attorney review for each state required)
- Each state's Hospital Mode page requires full Tier 1 YMYL review (attorney + Kate) before publish

## getPatientRights() Output Rules
This is one of the 6 canonical functions. trackedExecution() wraps it — launch blocker if missing.

**Output must:**
- State the right in plain language (8th grade reading level)
- Cite the specific law or regulation by name and section (e.g., "California Health & Safety Code §1262.8")
- Explain how to exercise the right (specific steps)
- Note state-specific variations where relevant
- Include disclaimer: "State laws change. Verify current law at [state agency URL]. This is informational only and not legal advice."

**Output must never:**
- Interpret whether a specific situation violates the law ("your hospital violated your rights")
- Provide a legal opinion on the user's specific case
- Guarantee that a specific right applies to the user's specific insurer, plan type, or employment status
- Omit the citation — no uncited patient rights claims

## State Rights Summary Format
Each state page follows this template:
1. **Emergency care rights** — EMTALA summary + state law citation
2. **Surprise billing protections** — No Surprises Act + state law citation
3. **Grievance and appeals process** — state insurance commissioner process
4. **Hospital billing rights** — itemized billing, charity care, financial assistance
5. **Mandated reporter note** — if the state has mandated reporter rules affecting the platform (attorney-reviewed note)

## YMYL Review Requirements for Hospital Mode Content
- **Tier 1 (attorney + Kate required):** Any content citing specific statutes, any content about mandated reporter obligations, any content about legal rights in emergency situations
- **Tier 2 (Kate required):** State rights summaries, billing rights guides, grievance process explanations
- **No Hospital Mode content ships without the appropriate review documented**

## Mandated Reporter — Do Not Publish Without Attorney Sign-Off
The Report Abuse tool (Phase 2 feature) is gated on attorney explicitly clearing the mandated reporter question in CA, TX, and NY. Until that clearance is documented:
- Do not build the Report Abuse tool
- Do not publish content that implies the platform has mandated reporter obligations
- Do not publish content advising users about mandated reporter procedures

## Refresh Schedule
- Tier 1 Hospital Mode content: every 6 months OR when relevant state law changes — whichever comes first
- LegiScan weekly 20-minute review flags relevant state law changes
- When a flag fires: pull the affected page, re-run Tier 1 review, republish

## Content Localization
- Spanish translation is non-negotiable (§6J in PMP) — translator required before Hospital Mode launches
- Translator must be a native speaker, not AI-only translation
- All state rights summaries must be available in English and Spanish at launch of each state
