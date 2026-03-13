# MA-TRJ-001 — Trajectory Event Taxonomy
**Family:** Trajectory (TRJ) | **Authority Level:** Supporting Anchor
**Status:** LOCKED — v1.0 | **Date:** 2026-03
**Authority:** MA-MEM-001 | **Owner:** Founder
**⚠️ CRITICAL:** These enum values are locked before Sprint 1 schema deployment. Changing any value after trajectory_events are in production breaks historical data consistency. All changes require a new migration + founder approval + Decision Log entry.

---

## 1. workflow_type

The primary workflow that generated the trajectory event. Drives all retrieval matching.

| Value | Description | Memory Eligible (Phase 2) |
|---|---|---|
| `denial_appeal` | Insurance denial appeal letter generation | Yes — Sprint 5 |
| `bill_dispute` | Medical bill dispute letter generation | Yes — Sprint 5 |
| `denial_decode` | Denial code explanation (Denial Decoder tool) | Yes — Sprint 4 |
| `resource_route` | Local resource connector routing | Yes — Sprint 6 |
| `report_abuse` | Abuse report intake | Phase 3 only |

---

## 2. denial_code_family

Bucketed denial code group. NEVER the raw CPT/denial code entered by the user. Applied only to `denial_appeal` and `denial_decode` workflow types.

| Value | Description | Example raw codes this covers |
|---|---|---|
| `AUTH` | Prior authorization / precertification denial | PA, 197, CO-50 |
| `COV` | Coverage or benefit limitation | CO-97, CO-96, CO-4 |
| `MED` | Medical necessity denial | CO-50, CO-57 |
| `COORD` | Coordination of benefits / other insurance | CO-22, OA-23 |
| `DUP` | Duplicate claim | CO-18 |
| `INFO` | Missing or incomplete information | CO-16, CO-15 |
| `PROC` | Procedure/coding issue (modifier, code) | CO-4, CO-5, CO-11 |
| `LIMIT` | Plan limitation or frequency limit | CO-119, CO-97 |
| `EXCL` | Explicit exclusion from plan | CO-96 |
| `APPEAL` | Denial while appeal is pending | — |
| `OTHER` | Does not fit above buckets | — |

---

## 3. insurer_category

Insurer tier/type. NEVER the insurer's name if individually identifiable at a small scale. Abstracted to category level.

| Value | Description |
|---|---|
| `BCBS_NATIONAL` | Blue Cross Blue Shield national programs |
| `BCBS_REGIONAL` | Blue Cross Blue Shield state/regional plans |
| `AETNA` | Aetna (CVS Health) |
| `CIGNA` | Cigna / Evernorth |
| `UNITED` | UnitedHealthcare / Optum |
| `HUMANA` | Humana |
| `CENTENE` | Centene / WellCare |
| `MOLINA` | Molina Healthcare |
| `KAISER` | Kaiser Permanente |
| `REGIONAL_HMO` | Regional HMO not listed above |
| `REGIONAL_PPO` | Regional PPO not listed above |
| `MEDICAID_STATE` | State Medicaid program |
| `MEDICARE_ADVANTAGE` | Medicare Advantage plan |
| `SELF_INSURED` | Employer self-insured plan (ERISA) |
| `UNKNOWN` | Could not be categorized |

---

## 4. procedure_category

Bucketed procedure type. NEVER the CPT code or specific procedure name from user input.

| Value | Description |
|---|---|
| `IMAGING` | MRI, CT, X-ray, ultrasound, PET scan |
| `LAB` | Laboratory tests, bloodwork, pathology |
| `SURGERY` | Inpatient or outpatient surgical procedures |
| `MENTAL_HEALTH` | Psychiatric, psychological, behavioral health |
| `PHYSICAL_THERAPY` | PT, OT, speech therapy, rehab services |
| `PHARMACY` | Prescription drugs, specialty pharmacy |
| `SPECIALIST` | Specialist visits (non-surgical) |
| `PRIMARY_CARE` | PCP visits, preventive screenings |
| `EMERGENCY` | ER, urgent care |
| `DME` | Durable medical equipment |
| `HOME_HEALTH` | Home nursing, infusion, home aide |
| `PREVENTIVE` | Vaccines, wellness exams, screenings |
| `REHAB` | Inpatient rehab, SNF, LTAC |
| `TELEHEALTH` | Telehealth/virtual visits |
| `OTHER` | Does not fit above buckets |

---

## 5. output_class

The classification of what generateLetter() produced.

| Value | Description |
|---|---|
| `letter_generated` | A complete letter was generated and returned |
| `explanation_only` | An explanation was provided without a full letter |
| `escalation_required` | Workflow determined escalation is needed (attorney, regulator) |
| `insufficient_input` | Intake data was insufficient to generate output |
| `error` | System error during execution |

---

## 6. user_action

What the user did with the output. Captured from frontend event after generation.

| Value | Description |
|---|---|
| `saved` | User saved the output to their account |
| `downloaded` | User downloaded the output |
| `copied` | User copied the output to clipboard |
| `abandoned` | User left without taking action |

---

## 7. tier_at_execution

Subscription tier at time of execution. Used for context, not PII.

| Value | Description |
|---|---|
| `free` | Free tier |
| `standard` | Standard paid tier |
| `founding` | Founding member tier |
| `per_case` | Per-case billing |

---

## 8. api_cost_bucket

Bucketed API cost indicator. Never an exact dollar amount.

| Value | Approximate range (internal calibration) |
|---|---|
| `low` | Below median cost execution |
| `medium` | Near median cost execution |
| `high` | Above median cost execution |

**Calibration note:** Thresholds for low/medium/high must be set during Sprint 1 based on baseline generateLetter() cost data. Reviewed quarterly and adjusted as model pricing changes. Document threshold values in MA-MEM-002.

---

## 9. execution_duration_ms_bucket

Bucketed latency indicator.

| Value | Approximate range (internal calibration) |
|---|---|
| `fast` | Below p50 execution time |
| `medium` | p50–p90 execution time |
| `slow` | Above p90 execution time |

**Calibration note:** Same as api_cost_bucket — thresholds set in Sprint 1, documented in MA-MEM-002.

---

## 10. letter_length_bucket

Bucketed output length. Never exact character or word count.

| Value | Description |
|---|---|
| `short` | < 300 words |
| `medium` | 300–700 words |
| `long` | > 700 words |

---

## 11. memory_class

| Value | Description | Auto-promote eligible | Kate review required |
|---|---|---|---|
| `strategy` | What approach works best for a given context pattern | No | Yes |
| `recovery` | How to recover from failure or ambiguous input | No | Yes |
| `optimization` | What reduces cost, steps, or friction without quality loss | Yes (low-sensitivity only, Sprint 6) | No (but founder notification required) |

---

## 12. memory_status

| Value | Description | Retrieval eligible |
|---|---|---|
| `draft` | Generated, not yet reviewed | No |
| `eligible` | Passed quality gate, awaiting human review | No |
| `approved` | Reviewed and cleared for production | Yes |
| `restricted` | Valid but conditionally eligible | Conditional |
| `retired` | No longer eligible | No |

---

## 13. ymyl_sensitivity

| Value | Description | Approval path |
|---|---|---|
| `low` | Routing, efficiency, cost reduction — no legal content | Founder only |
| `medium` | Involves insurer-specific or state-specific patterns | Founder + Kate |
| `high` | Touches escalation paths, legal framing, rights-adjacent | Founder + Kate + explicit approval comment |

---

## 14. compliance_review_status

| Value | Description |
|---|---|
| `pending` | Awaiting compliance review |
| `approved` | Cleared for production |
| `flagged` | Under compliance review — retrieval suspended |
| `rejected` | Rejected — will not be approved |

---

## 15. outcome_type (OutcomeRecord)

| Value | Description | Confidence signal |
|---|---|---|
| `appeal_won` | Insurance appeal was won | High |
| `appeal_pending` | Appeal submitted, outcome not yet known | Low |
| `appeal_lost` | Insurance appeal was lost | High |
| `dispute_resolved` | Medical bill dispute resolved favorably | High |
| `dispute_pending` | Dispute submitted, outcome pending | Low |
| `dispute_failed` | Dispute resolution unfavorable | High |
| `no_response` | No response received within follow-up window | Medium |
| `user_reported_helpful` | User self-reported output was helpful | Medium |
| `user_reported_unhelpful` | User self-reported output was not helpful | Medium |

---

## 16. outcome_source and outcome_confidence (OutcomeRecord)

**outcome_source:**

| Value | Description |
|---|---|
| `beehiiv_survey` | 30-day Beehiiv follow-up survey |
| `in_app_feedback` | In-app feedback mechanism |
| `attorney_referral_close` | Attorney referral outcome received |
| `user_self_report` | Direct user self-report |

**outcome_confidence:**

| Value | Description | Memory scoring eligible |
|---|---|---|
| `high` | Direct outcome with clear attribution | Yes |
| `medium` | Self-reported or indirect signal | Yes |
| `low` | Ambiguous or incomplete signal | No — excluded from memory scoring |

---

## 17. memory_retrieval_strategy (PromptTemplateMemoryConfig)

| Value | Description | Phase available |
|---|---|---|
| `metadata_match` | Structured JSONB trigger_conditions matching | Phase 2 |
| `hybrid` | pgvector semantic + metadata reranking | Phase 3+ only |

---

## Taxonomy Change Control

Any addition, removal, or rename of a value in this taxonomy requires:
1. Founder approval
2. Decision Log entry (MA-DEC reference)
3. New Supabase migration (never ALTER TYPE in place on production — add new value, deprecate old)
4. Memory Curator cluster query update if applicable
5. TypeScript type update in MA-MEM-002

**History:**
| Date | Change | Author |
|---|---|---|
| 2026-03 | v1.0 — Initial lock | Founder |
