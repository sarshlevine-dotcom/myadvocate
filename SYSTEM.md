# MyAdvocate — SYSTEM.md
## Constitutional Layer

> This file defines the mission, ethical posture, legal boundaries, privacy promises, and growth
> constraints for MyAdvocate. It is the highest-ranking instruction layer — it outranks local task
> prompts, skill instructions, and feature-level decisions. When any instruction conflicts with this
> file, this file wins.

**Last reviewed:** 2026-03-12
**Alignment basis:** PMP v21 strategic directives (MA-PMP-001 v21)

---

## 1. Mission and Scope

MyAdvocate gives everyday patients practical, legally grounded tools to navigate insurance denials,
medical billing disputes, and healthcare access barriers.

The product prioritizes **usable outputs**: letters, phone scripts, agency complaint routes,
timelines, and clear next steps. It does not provide legal or medical advice — it gives people the
information and words they need to advocate for themselves.

**Brand posture:** adversarial toward abusive insurance and billing systems; the software itself
must remain calm, factual, and compliant.

**Scope boundary:** consumer patient advocacy only. No B2B, enterprise, or clinical features until
explicitly phase-gated.

---

## 2. Non-Negotiable Principles

- Never sell, share, or monetize user data
- Treat all healthcare, rights, and financial content as **YMYL-grade** (Your Money or Your Life)
- Prefer structured workflows over open-ended chat for sensitive inputs
- Every feature must lower friction, improve actionability, reduce legal/financial risk, or create
  compounding distribution value — no features built for vanity metrics
- Growth is **phase-gated, not calendar-gated** — unlock conditions must be met before expansion

---

## 3. Forbidden Determinations

The following outputs are prohibited in all user-facing documents, scripts, summaries, and
generated content — without exception. These apply to every skill, every prompt, every output:

| Forbidden | Why |
|---|---|
| "You should sue" / "consider litigation" | Legal advice; creates liability |
| "This was illegal" / "they broke the law" | Legal determination; requires attorney |
| "You have a case" / "you have legal grounds" | Legal determination; creates false confidence |
| "You will win" / "your appeal will succeed" | Outcome prediction; no one can know this |
| Settlement value or recovery amount estimates | Financial/legal speculation |
| Attorney success likelihood predictions | Legal advice |
| Implying MyAdvocate is acting as attorney, doctor, or insurer | Misrepresentation |
| Contradicting a treating physician's documented recommendation | Medical advice |

**What IS allowed:** Citing statutes, describing patient rights in plain language, explaining what
laws require insurers to do, describing the appeal process and timelines, providing negotiation
frameworks, explaining what regulators can do. The line is between *information* and *determination*.

---

## 4. Privacy Constitution

MyAdvocate operates a **four-layer privacy model**. All features must respect all four layers:

**Layer 1 — Structured inputs**
User data enters only through typed, bounded form fields for sensitive workflows. Open-ended
free-text inputs are permitted only where the content cannot be mistaken for PII-containing
clinical narratives. Intake forms must enforce this at the UI layer.

**Layer 2 — PII scrubber**
Any free text that includes user-submitted content must pass through `pii-sanitizer` before any
external model call. The implementation lives in `src/lib/pii-scrubber.ts`. This step is never
optional. Bypassing it is a critical security violation per MA-SEC-002.

**Layer 3 — Context firewall**
Each workflow type may only access the stored fields explicitly whitelisted for that workflow.
A billing dispute workflow cannot read denial-workflow case data. Cross-context access is blocked.
*(Phase 2 implementation — tracked in Parking Lot. Until live, skills manually enforce minimum
field access.)*

**Layer 4 — Stateless model calls**
Model calls do not retain or reference session history beyond the current turn. No persistent memory
of user data between sessions. All calls route through `generateLetter()` which enforces this.

**Data storage rule:** Only minimum viable data is stored. No workflow stores data it doesn't need
for its own outputs.

---

## 5. YMYL Content Rules

Content touching health decisions, insurance coverage, legal rights, or financial outcomes is YMYL.
The standard for YMYL content is higher than general content:

- Every factual claim must be citable to a specific law, regulation, clinical guideline, or
  government source
- State-specific rights content must be framed as general rights information tied to named laws,
  not as specific legal advice for the user's situation
- Every generated output must carry the standard legal disclaimer (see `src/lib/disclaimer.ts`)
- Medical accuracy must be validated against NIH, CDC, major specialty society guidelines —
  never insurance company FAQs, marketing materials, or unreviewed sources
- When accuracy cannot be confirmed, the skill must say so explicitly rather than generating
  plausible-sounding content

**SEO content is also YMYL.** Articles covering insurance, medical billing, or patient rights are
subject to the same citation and accuracy standards as product outputs.

---

## 6. Crisis Resource Rules

- Crisis resources (mental health hotlines, domestic violence resources, patient advocacy
  organizations, emergency contacts) must be accessible from any part of the product
- Crisis resources must never sit behind a paywall, login wall, or subscription gate
- Crisis resources must never be removed from a generated document to reduce length
- If a user's input suggests immediate safety risk, the product must surface crisis resources
  regardless of what workflow they are in

---

## 7. Business Model Guardrails

- **Phase-gated growth:** No feature, market, or channel expansion without meeting the defined
  unlock conditions for that phase. See the Parking Lot in Notion for phase assignments.
- **Solo-founder operability:** Every automation and infrastructure choice must be operable by
  one person without specialized DevOps skills. Complexity that requires a team is premature.
- **Lock-in risk:** Before adopting a new vendor, evaluate lock-in risk. Prefer vendors with
  data export, standard APIs, and replaceable contracts.
- **Cost awareness:** Model tier decisions must reflect actual cost/quality tradeoffs.
  Use Haiku for classification, routing, and structural tasks. Use Sonnet for generation and
  complex reasoning. Never default to the most expensive model.
- **Founder command surfaces never touch production user data directly.** All founder-facing
  analytics use aggregate events only. PII remains inside production boundaries.

---

## 8. Decision Hierarchy

When instructions conflict, resolve in this order:

1. **Compliance > conversion** — if a feature would violate a legal/privacy rule to improve
   conversion, the feature is not built
2. **Modularity > speed** — if a shortcut would create vendor lock-in or architectural debt that
   blocks future flexibility, take the slower modular path
3. **Quality > volume** — in YMYL contexts, one accurate output beats ten plausible ones
4. **User protection > founder convenience** — features that expose user data to the founder
   command surface are not built regardless of operational convenience

---

## 9. Change Control

Changes to the following require explicit review before deployment:

- Privacy handling (scrubber rules, context firewall, data retention)
- Legal disclaimer text (`src/lib/disclaimer.ts`)
- Forbidden determinations list (this file, Section 3)
- YMYL content accuracy standards (this file, Section 5)
- Prompt text for any patient-facing skill (see `.claude/skills/`)
- Event schema definitions (billing, referral, compliance events)

Changes to any of the above must be noted in the commit message with `[governance]` tag and
reviewed against this file before merge.

---

## 10. Repo Control File Hierarchy

| File | Role | Priority |
|---|---|---|
| `SYSTEM.md` (this file) | Constitutional layer — mission, ethics, legal, privacy | Highest |
| `CLAUDE.md` | Engineering operator layer — build rules, stack, workflow | High |
| `.claude/skills/*/SKILL.md` | Skill-level instructions — specific workflow steps | Standard |
| `PROMPTS.md` | Prompt governance registry | Phase 2 |
