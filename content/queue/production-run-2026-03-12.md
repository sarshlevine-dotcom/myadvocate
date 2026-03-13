# Content Production Run — 2026-03-12
**Sprint:** S2-01
**Orchestrated by:** content-production-orchestrator
**Run date:** 2026-03-12
**Status:** ✅ COMPLETE

---

## Run Summary

| Metric | Count |
|---|---|
| Articles produced | 3 |
| Articles EEAT validated (all 5 layers PASS) | 3 |
| Articles ready for human review queue | 3 |
| Articles needing human review (flagged) | 0 |
| Social posts generated | 9 (3 per article × 3 platforms) |
| Newsletter segments | 3 |

---

## Publication Queue

### 1. CO-50: Not Medically Necessary
- **File:** `content/denial-codes/co-50-not-medically-necessary.md`
- **Target keyword:** CO-50 insurance denial not medically necessary appeal
- **Search volume:** 18,000/mo
- **Cluster:** cluster_0001 (Medical Necessity Denial Appeals)
- **Content tier:** 2
- **EEAT result:** ✅ PASS (all 5 layers)
- **Attorney review required:** No
- **Status:** READY FOR HUMAN REVIEW
- **EEAT gate note:** Article avoids direct statute citation; references federal law generally. Tier 2 confirmed. If final version adds specific CFR citations, re-run validator (will auto-escalate to Tier 3 requiring attorney review).
- **Medical accuracy note:** 40–60% win rate statistic should be hyperlinked to CMS/KFF source in published version.

### 2. CO-97: Bundled Billing
- **File:** `content/denial-codes/co-97-bundled-billing.md`
- **Target keyword:** CO-97 insurance denial bundled code dispute
- **Search volume:** 2,800/mo
- **Cluster:** cluster_0007 (Administrative Denial Hub)
- **Content tier:** 1
- **EEAT result:** ✅ PASS (all 5 layers)
- **Attorney review required:** No
- **Status:** READY FOR HUMAN REVIEW
- **Note:** Modifier references (-59, XS) verified as current CMS coding guidance.

### 3. PR-204: Not Covered Under Plan
- **File:** `content/denial-codes/pr-204-not-covered-under-plan.md`
- **Target keyword:** PR-204 insurance denial not covered under plan appeal
- **Search volume:** 2,100/mo
- **Cluster:** cluster_0009 (Coverage and Network Denial Hub)
- **Content tier:** 1
- **EEAT result:** ✅ PASS (all 5 layers)
- **Attorney review required:** No
- **Status:** READY FOR HUMAN REVIEW

---

## Medical Accuracy Checker Results

| Article | Status | Notes |
|---|---|---|
| CO-50 | PASS WITH NOTES | 40-60% appeal win rate stat — link to CMS/Healthcare.gov data in final publish |
| CO-97 | PASS | NCCI bundling references verified against CMS sources |
| PR-204 | PASS | Essential health benefits reference verified against CMS |

---

## Legal Disclaimer Check

All 3 articles contain the required disclaimer text:
- "does not constitute legal or medical advice" ✅
- "not a law firm" ✅
- "consult a qualified attorney or healthcare professional" ✅

---

## Derived Content Queue

### Social Posts (9 total — 3 per article)

**CO-50:**
- LinkedIn: "Your insurer just sent you a CO-50 denial. Here's what that actually means — and why fewer than 1% of patients appeal even though the majority who do win."
- Twitter/X: "CO-50 denial? That's 'not medically necessary.' You can appeal. 40-60% of patients who appeal win. Here's how → [link]"
- Facebook: "Did your insurance company deny your claim with code CO-50? You have rights. Here's exactly how to appeal a 'not medically necessary' denial — step by step."

**CO-97:**
- LinkedIn: "CO-97 means your insurer thinks you double-billed for bundled services. Here's how to tell if they're right — and how to dispute it when they're not."
- Twitter/X: "Got a CO-97 denial? Check the dates. Different service dates = automatic dispute grounds. Here's the fix → [link]"
- Facebook: "Insurance denied a claim with CO-97? It means 'bundled service.' But bundling rules get applied incorrectly all the time. Learn when you can dispute it."

**PR-204:**
- LinkedIn: "PR-204 feels like a final answer — 'not covered.' But billing errors, wrong procedure codes, and coverage exceptions mean it's not always the end of the road."
- Twitter/X: "PR-204 denial? Before you accept it, check your Summary of Benefits. Not all PR-204s are correct → [link]"
- Facebook: "Your insurer used code PR-204 — 'not covered.' But is it actually excluded from your plan? Here's how to check and what to do if it wasn't applied correctly."

### Newsletter Segments (3)

**CO-50 segment:**
> Got a CO-50 denial? Your insurer decided your treatment wasn't "medically necessary" — but that's a decision you can fight. This week we break down exactly what CO-50 means, why insurance companies apply it, and the step-by-step appeal process that gives you the best chance of reversal. Read more →

**CO-97 segment:**
> CO-97 is one of the most misunderstood denial codes in medical billing. It sounds technical — "bundled service" — but the fix is often simpler than you think. We explain when CO-97 is correct, when it's an error, and how to dispute it in minutes. Read more →

**PR-204 segment:**
> A PR-204 denial means "not covered" — but that's not always the final word. Billing errors, wrong procedure codes, and federal coverage requirements can all overturn a PR-204. Here's what to check before paying the bill. Read more →

---

## Blocking Gates Reminder

🚫 **PUBLISH GATE: BLOCKED** — All 7 trust infrastructure pages must pass attorney review before any SEO content publishes (MA-EEAT-001 §5.1). Open Notion task: "Engage attorney for trust page review."

These articles are **READY FOR HUMAN REVIEW** but must not be published until the attorney review gate clears.

---

## Next Run Recommendations

Based on search volume and cluster priority, recommended next batch (3-5 articles):

| Priority | Code | Keyword | Volume | Cluster |
|---|---|---|---|---|
| 1 | CO-151 | CO-151 insurance denial prior authorization required appeal | 4,500/mo | cluster_0002 |
| 2 | CO-197 | CO-197 insurance denial prior authorization not obtained | 3,800/mo | cluster_0002 |
| 3 | CO-96 | CO-96 insurance denial non-covered charge appeal | 3,500/mo | cluster_0009 |
| 4 | CO-45 | CO-45 insurance denial charge exceeds fee schedule | 2,200/mo | cluster_0007 |
| 5 | CO-29 | CO-29 insurance denial timely filing exceeded | 1,500/mo | cluster_0007 |

**Note:** CO-151 and CO-197 (prior auth cluster) are the highest referral-conversion articles and should be prioritized for the next batch once the attorney review gate clears.
