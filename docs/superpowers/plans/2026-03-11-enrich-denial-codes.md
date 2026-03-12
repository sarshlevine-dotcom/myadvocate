# Enrich Denial Codes Dataset Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the `denial_codes` table with 4 new columns, expand category values, and seed 50+ fully-populated denial codes to power the pSEO content engine.

**Architecture:** New SQL migration adds columns to existing table; seed file is replaced with ON CONFLICT DO UPDATE to backfill new fields for existing rows and insert new ones; TypeScript types are manually updated (stub pattern — no CLI gen available) and a new `getRelatedDenialCodes` helper is added.

**Tech Stack:** Supabase (Postgres), TypeScript, Next.js 14 App Router, Vitest

**Important — Project Location:** The project root is `/Users/sarshlevine/myadvocate/` — NOT the session working directory. Use absolute paths for all commands.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/<timestamp>_enrich-denial-codes.sql` | **Create** | Adds 4 new columns; drops and recreates expanded category CHECK |
| `supabase/seed/denial_codes.sql` | **Replace** | 50+ codes, all 7 new fields populated, ON CONFLICT DO UPDATE |
| `src/types/supabase.ts` | **Modify** | Add new columns to denial_codes Row/Insert/Update |
| `src/types/domain.ts` | **Modify** | Add DenialCode interface and DenialCodeCategory/ToolCtaId types |
| `src/lib/db/denial-codes.ts` | **Modify** | Add getRelatedDenialCodes() export |
| `src/lib/db/__tests__/denial-codes.test.ts` | **Create** | Unit tests for getRelatedDenialCodes() |

---

## Chunk 1: Migration + TypeScript Types

### Task 1: Create the migration file

**Files:**
- Create: `supabase/migrations/<timestamp>_enrich-denial-codes.sql` (filename set by Supabase CLI)

- [ ] **Step 1: Generate migration file via Supabase CLI**

```bash
cd /Users/sarshlevine/myadvocate
supabase migration new enrich-denial-codes
```

Expected output: something like `Created new migration at supabase/migrations/20260311000000_enrich-denial-codes.sql`

Note the exact filename — it will include a timestamp prefix.

- [ ] **Step 2: Write migration content**

Open the generated file and write the following:

```sql
-- Migration: enrich_denial_codes
-- Adds common_causes, appeal_angle, related_codes, tool_cta_id columns.
-- Expands category CHECK constraint with healthcare-domain values.

-- 1. Add new columns (nullable — existing rows will be backfilled by seed)
ALTER TABLE public.denial_codes
  ADD COLUMN IF NOT EXISTS common_causes   TEXT,
  ADD COLUMN IF NOT EXISTS appeal_angle    TEXT,
  ADD COLUMN IF NOT EXISTS related_codes   TEXT[],
  ADD COLUMN IF NOT EXISTS tool_cta_id     TEXT;

-- 2. Drop the old category CHECK and recreate with expanded values.
-- PostgreSQL auto-names inline CHECK constraints as {table}_{column}_check.
ALTER TABLE public.denial_codes
  DROP CONSTRAINT IF EXISTS denial_codes_category_check;

ALTER TABLE public.denial_codes
  ADD CONSTRAINT denial_codes_category_check
  CHECK (category IN (
    'labs', 'imaging', 'surgery', 'dme', 'pharmacy',
    'mental_health', 'prior_auth', 'coordination', 'timely_filing', 'other'
  ));
```

- [ ] **Step 3: Apply migration to local DB**

```bash
cd /Users/sarshlevine/myadvocate
supabase db push
```

Expected: `Applied migration ...enrich-denial-codes.sql` with no errors.
If Supabase is not running: `supabase start` first.

---

### Task 2: Update TypeScript types

**Files:**
- Modify: `src/types/supabase.ts` (denial_codes section, lines ~278–306)
- Modify: `src/types/domain.ts`

- [ ] **Step 1: Add new types to domain.ts**

Add after the existing type exports (before the CASE_TRANSITIONS constant):

```typescript
export type DenialCodeCategory =
  | 'labs' | 'imaging' | 'surgery' | 'dme' | 'pharmacy'
  | 'mental_health' | 'prior_auth' | 'coordination' | 'timely_filing' | 'other'

export type ToolCtaId =
  | 'denial_decoder' | 'appeal_generator' | 'bill_dispute' | 'hipaa_request'

export interface DenialCode {
  id: string
  code: string
  category: DenialCodeCategory
  plain_language_explanation: string
  recommended_action: string
  source: string
  updated_at: string
  common_causes: string | null
  appeal_angle: string | null
  related_codes: string[] | null
  tool_cta_id: ToolCtaId | null
}
```

- [ ] **Step 2: Update denial_codes in supabase.ts**

Replace the `denial_codes` block (currently lines 278–306) with:

```typescript
      denial_codes: {
        Row: {
          id: string
          code: string
          category: 'labs' | 'imaging' | 'surgery' | 'dme' | 'pharmacy' | 'mental_health' | 'prior_auth' | 'coordination' | 'timely_filing' | 'other'
          plain_language_explanation: string
          recommended_action: string
          source: string
          updated_at: string
          common_causes: string | null
          appeal_angle: string | null
          related_codes: string[] | null
          tool_cta_id: string | null
        }
        Insert: {
          id?: string
          code: string
          category: 'labs' | 'imaging' | 'surgery' | 'dme' | 'pharmacy' | 'mental_health' | 'prior_auth' | 'coordination' | 'timely_filing' | 'other'
          plain_language_explanation: string
          recommended_action: string
          source: string
          updated_at?: string
          common_causes?: string | null
          appeal_angle?: string | null
          related_codes?: string[] | null
          tool_cta_id?: string | null
        }
        Update: {
          id?: string
          code?: string
          category?: 'labs' | 'imaging' | 'surgery' | 'dme' | 'pharmacy' | 'mental_health' | 'prior_auth' | 'coordination' | 'timely_filing' | 'other'
          plain_language_explanation?: string
          recommended_action?: string
          source?: string
          updated_at?: string
          common_causes?: string | null
          appeal_angle?: string | null
          related_codes?: string[] | null
          tool_cta_id?: string | null
        }
      }
```

---

## Chunk 2: Seed Data + DB Helper + Tests

### Task 3: Write the failing test for getRelatedDenialCodes

**Files:**
- Create: `src/lib/db/__tests__/denial-codes.test.ts`

Note: There is no existing `src/lib/db/__tests__/` directory — create it.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock must be declared before import
const mockIn = vi.fn()
const mockSelect = vi.fn(() => ({ in: mockIn }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

import { getRelatedDenialCodes } from '@/lib/db/denial-codes'

const MOCK_CODES = [
  {
    id: 'uuid-1',
    code: 'CO-4',
    category: 'prior_auth',
    plain_language_explanation: 'The service is inconsistent with the patient\'s age.',
    recommended_action: 'Request a peer-to-peer review.',
    source: 'CARC',
    updated_at: '2026-01-01T00:00:00Z',
    common_causes: 'Age criteria mismatch.',
    appeal_angle: 'Submit physician attestation.',
    related_codes: ['CO-197', 'CO-234'],
    tool_cta_id: 'appeal_generator',
  },
  {
    id: 'uuid-2',
    code: 'CO-16',
    category: 'other',
    plain_language_explanation: 'Claim lacks information.',
    recommended_action: 'Resubmit with complete information.',
    source: 'CARC',
    updated_at: '2026-01-01T00:00:00Z',
    common_causes: 'Missing required fields.',
    appeal_angle: 'Identify and add missing fields.',
    related_codes: ['CO-11'],
    tool_cta_id: 'denial_decoder',
  },
]

describe('getRelatedDenialCodes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIn.mockResolvedValue({ data: MOCK_CODES, error: null })
  })

  it('returns codes matching the given code strings', async () => {
    const result = await getRelatedDenialCodes(['CO-4', 'CO-16'])
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.code)).toContain('CO-4')
    expect(result.map((c) => c.code)).toContain('CO-16')
  })

  it('queries the denial_codes table with in() filter', async () => {
    await getRelatedDenialCodes(['CO-4', 'CO-16'])
    expect(mockFrom).toHaveBeenCalledWith('denial_codes')
    expect(mockIn).toHaveBeenCalledWith('code', ['CO-4', 'CO-16'])
  })

  it('returns empty array when no codes match', async () => {
    mockIn.mockResolvedValue({ data: [], error: null })
    const result = await getRelatedDenialCodes(['NONEXISTENT'])
    expect(result).toEqual([])
  })

  it('throws when Supabase returns an error', async () => {
    mockIn.mockResolvedValue({ data: null, error: new Error('DB error') })
    await expect(getRelatedDenialCodes(['CO-4'])).rejects.toThrow('DB error')
  })

  it('returns empty array for empty input', async () => {
    mockIn.mockResolvedValue({ data: [], error: null })
    const result = await getRelatedDenialCodes([])
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/sarshlevine/myadvocate
npm test -- src/lib/db/__tests__/denial-codes.test.ts
```

Expected: FAIL — `getRelatedDenialCodes is not a function` (or similar import error)

---

### Task 4: Implement getRelatedDenialCodes

**Files:**
- Modify: `src/lib/db/denial-codes.ts`

- [ ] **Step 1: Add the new export**

Append to `src/lib/db/denial-codes.ts`:

```typescript
export async function getRelatedDenialCodes(codes: string[]) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('denial_codes')
    .select()
    .in('code', codes)
  if (error) throw error
  return data ?? []
}
```

- [ ] **Step 2: Run test to confirm it passes**

```bash
cd /Users/sarshlevine/myadvocate
npm test -- src/lib/db/__tests__/denial-codes.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 3: Run full test suite to check for regressions**

```bash
cd /Users/sarshlevine/myadvocate
npm test
```

Expected: All tests PASS.

---

### Task 5: Expand seed data

**Files:**
- Replace: `supabase/seed/denial_codes.sql`

This is the largest task. The file must include 50+ codes with all 9 fields (including 4 new ones). Use `ON CONFLICT (code) DO UPDATE SET` so re-seeding is idempotent and existing rows are backfilled.

- [ ] **Step 1: Replace supabase/seed/denial_codes.sql with the full dataset**

Write the following content to `supabase/seed/denial_codes.sql`:

```sql
-- Enriched denial codes seed — 53 codes, all fields populated.
-- ON CONFLICT DO UPDATE ensures idempotent re-seeding and backfills new columns.
INSERT INTO public.denial_codes (
  code, category, plain_language_explanation, recommended_action, source,
  common_causes, appeal_angle, related_codes, tool_cta_id
) VALUES

-- ── CO SERIES (Contractual Obligation) ─────────────────────────────────────

('CO-1',
 'other',
 'The deductible amount has not yet been met — this portion is the patient''s responsibility.',
 'Confirm the patient''s deductible balance with the insurer. If the EOB is incorrect, provide proof of prior payments toward the deductible.',
 'CARC',
 'Payers issue CO-1 when a patient''s annual deductible has not been satisfied before the claim date. This commonly occurs early in the plan year or when a patient switches plans mid-year. High-deductible health plans (HDHPs) generate this code frequently.',
 'Request an itemized deductible accumulation statement from the insurer. If prior in-network payments are missing from the accumulator, dispute with documentation of those payments. For HDHPs, verify whether HSA or HRA funds can cover the balance.',
 ARRAY['CO-2','CO-3','PR-1'],
 'bill_dispute'),

('CO-2',
 'other',
 'The coinsurance amount is the patient''s share of the cost after the deductible is met.',
 'Confirm the coinsurance percentage and verify the claim was processed at in-network rates. If billed as out-of-network erroneously, dispute the network classification.',
 'CARC',
 'CO-2 appears when a patient owes a percentage (e.g., 20%) of the allowed amount after their deductible. It is most common for specialist visits, hospital stays, and outpatient procedures. Surprise billing situations can inflate the amount if an out-of-network rate was applied.',
 'Verify the provider''s network status on the date of service using the insurer''s online directory. If an in-network provider was incorrectly processed as out-of-network, submit a corrected claim with proof of network participation.',
 ARRAY['CO-1','CO-3','PR-2'],
 'bill_dispute'),

('CO-3',
 'other',
 'The co-payment amount is a fixed fee the patient owes at the time of service.',
 'Verify the correct co-pay tier for the service type (PCP, specialist, urgent care, ER) under the patient''s current plan. Check that the billed code matches the service rendered.',
 'CARC',
 'CO-3 is issued when a fixed co-pay applies based on the type of service. The co-pay amount varies by plan tier (PCP vs. specialist vs. ER), and billing the wrong service code can result in a higher co-pay being applied than appropriate.',
 'Request the Explanation of Benefits (EOB) and compare the co-pay amount to the Summary of Benefits. If the wrong service category was applied, submit a corrected claim with documentation of the service type rendered.',
 ARRAY['CO-1','CO-2','PR-3'],
 'bill_dispute'),

('CO-4',
 'prior_auth',
 'The service billed is not consistent with the patient''s age as defined by the insurer''s coverage policy.',
 'Request a peer-to-peer review with the insurer''s medical director and submit clinical documentation explaining why this service is medically necessary for this patient''s age group.',
 'CARC',
 'Insurers hard-code age eligibility rules into their coverage policies. CO-4 triggers when a procedure (e.g., a pediatric immunization code billed for an adult, or a screening recommended only for patients 65+) falls outside the accepted age range. These rules are often automated and not clinically reviewed at the first pass.',
 'Obtain the insurer''s specific coverage policy for the procedure and identify the age restriction. Gather peer-reviewed clinical literature supporting the service for the patient''s age. Initiate a peer-to-peer review — physicians can often overturn age-based algorithmic denials by citing clinical atypicality.',
 ARRAY['CO-197','CO-234','N362'],
 'appeal_generator'),

('CO-11',
 'other',
 'The diagnosis code submitted does not clinically support the procedure that was billed.',
 'Identify the correct ICD-10 diagnosis code that justifies the procedure, or determine whether a secondary diagnosis should be added to the claim. Resubmit as a corrected claim.',
 'CARC',
 'Payers use coverage policies (sometimes called "coverage determination tables") that map specific diagnosis codes to covered procedures. If the ICD-10 code is too generic, outdated, or simply mismatched, the claim is automatically denied. This is a common coding error in fast-paced clinical environments.',
 'Request the payer''s specific LCD (Local Coverage Determination) or NCD (National Coverage Determination) for the procedure. If the diagnosis is correct but coded at the wrong specificity, re-code to the appropriate ICD-10 level. If a secondary or primary diagnosis better supports the procedure, add it with clinical notes attached.',
 ARRAY['CO-16','CO-234','N4'],
 'denial_decoder'),

('CO-16',
 'other',
 'The claim is missing required information or contains submission/billing errors that prevent processing.',
 'Contact the payer to identify which specific field or attachment is missing, then correct and resubmit the claim. Check the Remark codes on the EOB for specifics.',
 'CARC',
 'CO-16 is a catch-all denial for incomplete or malformed claims. Common missing elements include the referring provider''s NPI, a prior authorization number, the accident date for injury-related claims, required attachments (operative reports, certificates of medical necessity), or modifier codes. It often reflects a billing workflow gap rather than a clinical issue.',
 'Review the EOB Remark codes alongside CO-16 — they identify the exact missing field (e.g., N290 = "missing/incomplete/invalid rendering provider primary identifier"). Correct only the deficient element and resubmit as a corrected claim (not a new claim) to preserve the original filing date.',
 ARRAY['CO-11','N1','N3','N4'],
 'denial_decoder'),

('CO-22',
 'coordination',
 'This service may be covered by another insurance plan — coordination of benefits (COB) applies.',
 'Determine the correct primary payer order per COB rules and submit the claim to the primary insurer first. Provide the primary EOB when billing the secondary payer.',
 'CARC',
 'CO-22 is triggered when the payer believes another insurer should pay first. This happens when a patient has dual coverage (e.g., Medicare + commercial, or two employer plans), when the patient is covered under a spouse''s plan, or when a workers'' comp or auto insurer is primary for injury claims. Incorrect COB order is a common reason for this denial.',
 'Determine the correct payer order using the "birthday rule" for dependent children or the coordination of benefits rules for dual employer coverage. Submit to the primary first and obtain an EOB. Then submit to the secondary with the primary EOB attached. For workers'' comp or auto-related injuries, those carriers are always primary.',
 ARRAY['OA-1','OA-23','PR-204','N20'],
 'denial_decoder'),

('CO-24',
 'coordination',
 'Charges are covered under a capitation agreement or managed care plan — no additional payment is due.',
 'Confirm whether the provider is capitated for this service under the patient''s plan. If not capitated, request clarification from the payer and resubmit with documentation of your fee-for-service agreement.',
 'CARC',
 'CO-24 occurs when a payer considers the service included in a per-member-per-month (capitation) payment already made to the provider''s group. This is common in HMO and IPA (Independent Practice Association) arrangements where certain services are bundled into the capitation rate.',
 'Review your capitation contract to verify which services are carved out of the capitation rate. If the service is explicitly excluded from capitation and billable separately, submit a rebuttal with the contract language and a fee-for-service claim. Escalate to your practice management or contracting department if needed.',
 ARRAY['CO-45','CO-97'],
 'bill_dispute'),

('CO-27',
 'other',
 'The claim was submitted for expenses incurred after the patient''s coverage end date.',
 'Verify the exact coverage termination date with the insurer. If coverage was actually active on the date of service (e.g., due to a grace period or retroactive reinstatement), submit documentation to the payer.',
 'CARC',
 'CO-27 is issued when the payer''s records show the patient''s coverage had already lapsed on the date of service. This often happens due to administrative delays in coverage termination processing, lapses due to missed premium payments, or errors in the payer''s enrollment database.',
 'Request the insurer''s records showing the exact termination date. If the patient paid premiums through the service date or was in a grace period, provide payment confirmation. If the coverage termination was retroactive and the patient was unaware, argue for equitable relief under the plan''s retroactive termination policy.',
 ARRAY['CO-200','PR-27'],
 'appeal_generator'),

('CO-29',
 'timely_filing',
 'The claim was submitted after the insurer''s filing deadline has expired.',
 'Submit an appeal documenting why the claim was not filed timely — attach any evidence of good-faith efforts (prior submissions, payer-side delays, or eligibility issues that prevented earlier filing).',
 'CARC',
 'Timely filing denials occur when a claim arrives after the payer''s deadline (typically 90–180 days from service, though this varies by plan). Causes include delayed payment from another payer, eligibility disputes that paused billing, billing system errors, or simply administrative oversight. Secondary claim filing windows may differ from primary.',
 'Gather evidence of an exception: (1) if previously submitted within the window, provide proof of the original submission date; (2) if the primary payer delayed, attach the primary EOB date; (3) if there was a coverage dispute or eligibility issue, document the timeline. Some payers will waive timely filing limits if there is documented insurer fault.',
 ARRAY['CO-16','N30'],
 'appeal_generator'),

('CO-45',
 'other',
 'The billed charge exceeds the contracted fee schedule or the insurer''s maximum allowable amount.',
 'Verify your contracted rate for this procedure and reconcile the allowed amount. If billing out-of-network, evaluate whether a gap exception or surprise billing protection applies.',
 'CARC',
 'CO-45 is one of the most common contractual adjustments. It reflects the difference between what the provider billed and what the payer has agreed to pay (or will pay for out-of-network). This write-off is typically required by the provider''s contract and is not a billable amount to the patient for in-network providers.',
 'For in-network providers, confirm the contracted rate matches the EOB. If the payer applied the wrong fee schedule, dispute with a copy of the contract. For out-of-network situations, explore the No Surprises Act protections if applicable. For patients, confirm they are not being billed for this write-off amount (balance billing protection).',
 ARRAY['CO-97','CO-2'],
 'bill_dispute'),

('CO-50',
 'prior_auth',
 'The service is not covered under the patient''s current benefit plan.',
 'Request the specific exclusion language from the plan''s Summary of Benefits. If the service has a clinical basis that qualifies as medically necessary under an alternative coverage category, build an appeal using clinical evidence.',
 'CARC',
 'CO-50 is a non-coverage denial, issued when the service is excluded by the plan. This can be categorical (e.g., cosmetic procedures) or conditional (e.g., a service requires specific diagnostic criteria to be covered). Sometimes a service coded incorrectly triggers CO-50 when a different code for the same clinical service is actually covered.',
 'Obtain the plan''s benefit exclusion in writing. Research whether the same clinical service can be billed under an alternative code that is covered. If the service is medically necessary and a non-covered exclusion seems inconsistent with clinical guidelines, request an external independent review (available in most states after internal appeal is exhausted).',
 ARRAY['CO-96','CO-167','N95'],
 'appeal_generator'),

('CO-55',
 'other',
 'The procedure or product has not been approved by the FDA for this indication.',
 'Document the clinical evidence for off-label use and submit a medical necessity appeal citing peer-reviewed guidelines and published clinical outcomes data.',
 'CARC',
 'CO-55 occurs when an insurer denies a claim because the drug, device, or procedure is being used off-label (outside FDA-approved indications). This is common in oncology, rare diseases, and pediatric medicine where off-label use is clinically established but FDA approval lags clinical practice.',
 'Build an appeal packet: (1) physician letter explaining why on-label alternatives are insufficient or contraindicated; (2) peer-reviewed literature supporting the off-label use; (3) professional society guidelines (NCCN, ASCO, etc.) endorsing the use. Many state laws and ACA provisions require coverage of off-label cancer treatments supported by recognized compendia.',
 ARRAY['CO-50','CO-234'],
 'appeal_generator'),

('CO-96',
 'other',
 'The service or charge is not covered based on the patient''s current benefit plan terms.',
 'Request the full explanation of why this specific service is excluded. If a coverage upgrade or alternative plan covers it, explore switching options. Otherwise, build an appeal showing medical necessity.',
 'CARC',
 'CO-96 is a general non-covered charge denial — it indicates the insurer''s determination that the service falls outside the policy''s covered benefits. It may overlap with CO-50 and is often paired with a Remark code specifying the exclusion reason.',
 'Request the denial in writing with specific reference to the plan document or coverage policy used to determine non-coverage. Compare it against the Summary of Benefits. If the denial relies on a medical policy exclusion that contradicts state mandated benefits or ACA requirements, cite the applicable law in your appeal.',
 ARRAY['CO-50','CO-97','N95'],
 'denial_decoder'),

('CO-97',
 'other',
 'Payment for this service is already included in the allowance for another service or procedure billed on the same claim.',
 'Review the bundling rule applied and determine whether an NCCI (National Correct Coding Initiative) modifier exemption applies. If unbundling is clinically justified, submit a corrected claim with the appropriate modifier and documentation.',
 'CARC',
 'CO-97 reflects claims bundling — insurers apply NCCI edits and their own bundling logic to prevent billing separately for services that should be included in a comprehensive procedure payment. However, legitimate separate services performed at the same session can be unbundled with the correct modifier (usually modifier -59 or XS/XU/XE/XP).',
 'Identify which service the payer considers "parent" and which is being bundled as "component." Consult NCCI edits to see if a column 1/column 2 pair allows an override with a modifier. If the procedures were distinct and clinically separate, resubmit with modifier -59 and an operative or procedural note clearly documenting the separate, distinct service.',
 ARRAY['CO-45','CO-4'],
 'denial_decoder'),

('CO-109',
 'other',
 'The claim has not been identified as a covered benefit under the patient''s benefit plan.',
 'Request the insurer''s specific coverage policy document. If the service is implicitly covered through medical necessity provisions or state-mandated benefits, make that argument in an appeal.',
 'CARC',
 'CO-109 is issued when the payer cannot match the billed service to any covered benefit category in the patient''s plan. It is sometimes used interchangeably with CO-50/CO-96 and may indicate a plan document ambiguity rather than an explicit exclusion.',
 'Compare the denial to the Summary of Benefits. If no explicit exclusion exists but the payer still denies coverage, request the internal coverage determination process document. In many states, ambiguous plan language must be interpreted in favor of the patient (contra proferentem). File an internal appeal citing the absence of an explicit exclusion.',
 ARRAY['CO-50','CO-96'],
 'appeal_generator'),

('CO-119',
 'other',
 'The benefit maximum for this service type has been reached — no further coverage is available for this plan year.',
 'Verify the benefit maximum used vs. the plan''s stated limit. If the accumulator is incorrect, dispute it. If the maximum is legitimate, explore secondary coverage, assistance programs, or pharmaceutical patient assistance if applicable.',
 'CARC',
 'CO-119 is issued when the patient has exhausted a benefit cap — common for mental health visits (though parity laws may apply), physical therapy sessions, skilled nursing days, or chiropractic visits. Benefit accumulators can also be miscalculated if prior claims were counted incorrectly.',
 'Request an itemized accounting of all claims applied to the benefit maximum. Verify each is correctly attributed. For mental health or substance abuse, invoke the Mental Health Parity and Addiction Equity Act (MHPAEA) — if comparable medical/surgical benefits have no cap, the mental health cap may be illegal. For other services, request a medical necessity exception to extend coverage.',
 ARRAY['CO-50','N362'],
 'appeal_generator'),

('CO-151',
 'prior_auth',
 'The medical record submitted does not support the services that were billed.',
 'Submit additional clinical documentation — office notes, diagnostic results, prior treatment records — that directly demonstrates why the service was medically necessary.',
 'CARC',
 'CO-151 is triggered after a medical records review where the payer''s reviewer finds the documentation insufficient to justify the service. This is common for complex procedures, DME requests, and inpatient stays. It often reflects inadequate documentation of medical decision-making rather than actual lack of necessity.',
 'Request the specific clinical criteria the payer used to evaluate the records. Submit a physician attestation letter that explicitly maps the patient''s clinical findings to each criterion. Include relevant diagnostic results, prior treatment failures, and functional assessments. A peer-to-peer review with the insurer''s medical director is often the fastest path to reversal.',
 ARRAY['CO-234','CO-197','N10'],
 'appeal_generator'),

('CO-167',
 'other',
 'The submitted diagnosis is not covered under the patient''s benefit plan.',
 'Identify whether the diagnosis is explicitly excluded in the plan document or if it is being denied under a medical necessity standard. Seek a peer-to-peer review or submit additional clinical documentation.',
 'CARC',
 'CO-167 occurs when a payer has a specific exclusion for the diagnosis code submitted. Some plans exclude diagnoses related to obesity, infertility, routine care, or certain behavioral conditions. It may also occur when a diagnosis is coded at the wrong specificity.',
 'Request the specific exclusion clause from the plan document. If the diagnosis is partially covered or if a different (more specific or alternate) diagnosis code better represents the condition and is covered, consult with the treating physician about recoding. For chronic conditions denied as "routine," argue that the level of service provided was beyond routine preventive care.',
 ARRAY['CO-11','CO-50','CO-96'],
 'denial_decoder'),

('CO-170',
 'other',
 'The patient received care from a provider who is not in the insurer''s network.',
 'Confirm whether the provider is truly out-of-network. If the provider should be in-network (e.g., credentialing delay or directory error), dispute the network classification. Explore surprise billing protections if applicable.',
 'CARC',
 'CO-170 is an out-of-network denial. It occurs when a patient sees a provider not contracted with their plan, often unknowingly at in-network facilities (e.g., an out-of-network anesthesiologist at an in-network hospital). Payer directory errors are also common — providers may be listed as in-network but not yet credentialed.',
 'Verify the provider''s network status using the payer''s online directory from the date of service. If the provider was inadvertently out-of-network at an in-network facility, invoke No Surprises Act protections (effective Jan 2022) for emergency care or certain ancillary services. Request a gap exception if no in-network alternative was available.',
 ARRAY['CO-22','N30'],
 'appeal_generator'),

('CO-197',
 'prior_auth',
 'A precertification, prior authorization, or notification was required but was not obtained before the service was rendered.',
 'Contact the insurer to initiate a retrospective authorization request. Submit clinical documentation supporting medical necessity and, if applicable, an explanation of why prior authorization could not be obtained (e.g., emergency).',
 'CARC',
 'CO-197 is issued when a covered service required pre-approval but none was on file. This is extremely common for elective surgeries, advanced imaging (MRI, CT), specialty referrals in HMO plans, and high-cost medications. Billing staff or providers sometimes proceed without authorization due to workflow gaps or patient urgency.',
 'Request a retrospective authorization from the payer — many plans allow this for urgent or emergent care. Submit a strong medical necessity letter from the treating physician documenting why the service could not wait for prior authorization. If the payer denied a retroactive request, escalate to state insurance commissioner or appeal citing medical emergency circumstances.',
 ARRAY['CO-234','CO-4','N3'],
 'appeal_generator'),

('CO-200',
 'other',
 'The expenses were incurred after the patient''s coverage termination date.',
 'Verify the exact coverage end date. If there is a premium grace period or a dispute about the effective termination date, provide proof of coverage and payment history.',
 'CARC',
 'CO-200 occurs when a claim is submitted for a service rendered after the plan''s coverage officially ended — whether due to job loss, aging off a parent''s plan, failure to pay premiums, or plan year end without renewal. Retroactive terminations can cause CO-200 denials for claims that providers assumed were covered.',
 'Obtain a certificate of coverage and the exact termination date from the insurer. If the patient was in a COBRA or grace period on the date of service, provide payment proof. If coverage was terminated retroactively after the service was rendered without notice, challenge the retroactive termination as violating the plan''s notice requirements.',
 ARRAY['CO-27','PR-27'],
 'appeal_generator'),

('CO-234',
 'prior_auth',
 'Medical necessity for this service has not been established — the documentation submitted does not meet the payer''s criteria.',
 'Build a comprehensive medical necessity appeal: physician attestation, clinical evidence linking the diagnosis to the treatment, and documentation of prior conservative treatment failures.',
 'CARC',
 'CO-234 is one of the most contested denial codes. Insurers apply their own internal or adopted clinical guidelines (e.g., InterQual, MCG) to determine whether a service is necessary. Documentation that is too generic, missing key clinical indicators, or failing to document conservative treatment failures is the primary cause.',
 'Request the specific clinical criteria used for the medical necessity determination. In your appeal, write a physician letter that explicitly addresses each criterion: (1) the diagnosis and its severity; (2) why conservative/alternative treatments were tried and failed or are contraindicated; (3) the expected clinical benefit. Cite published clinical guidelines (ACOEM, ACP, specialty society) that support the treatment.',
 ARRAY['CO-197','CO-151','CO-4'],
 'appeal_generator'),

('CO-242',
 'prior_auth',
 'The services rendered were not authorized by the patient''s attending physician or primary care provider.',
 'Obtain a referral or order from the attending physician and submit it as part of a corrected claim or appeal. For HMO plans, the PCP''s referral is typically mandatory.',
 'CARC',
 'CO-242 appears in managed care plans (especially HMOs) where specialist visits and certain procedures require a referral or standing order from the patient''s primary care provider. It can also occur when a specialist performs a procedure not covered by the original referral scope.',
 'Contact the PCP to issue a retroactive referral if clinically appropriate and if the payer allows retroactive referrals. Attach the referral to an appeal letter. If the payer refuses retroactive referrals, argue that the specialist''s services were urgently necessary or that the patient was reasonably unaware of the referral requirement (particularly in transitional plan periods).',
 ARRAY['CO-197','N3'],
 'appeal_generator'),

('CO-253',
 'other',
 'The claim was denied due to a sequencing error — the primary and secondary procedure codes are in the wrong order.',
 'Review the correct CPT sequencing rules — principal procedure should be listed first. Resubmit the corrected claim with procedures in the appropriate order.',
 'CARC',
 'CO-253 is a billing/coding error where procedures on a claim are listed in an order that violates the payer''s sequencing rules. This most commonly occurs in surgical claims where the primary procedure (highest RVU) must be billed first, followed by secondary procedures, or in claims where a modifier''s position relative to the procedure code is incorrect.',
 'Review the claim''s CPT code sequence and compare to the payer''s billing guidelines. The principal procedure (most resource-intensive) should lead. Correct the order and resubmit as a corrected claim. If the original sequencing was clinically justified, document the rationale in the appeal.',
 ARRAY['CO-16','CO-97'],
 'denial_decoder'),

-- ── PR SERIES (Patient Responsibility) ─────────────────────────────────────

('PR-1',
 'other',
 'The deductible amount is the patient''s financial responsibility — the insurer''s payment only begins after the deductible is satisfied.',
 'Verify the patient''s deductible balance. If the deductible seems incorrect (too high or already met), request an itemized accounting from the insurer.',
 'CARC',
 'PR-1 parallels CO-1 but is attributed to the patient, not the provider. It appears on the provider''s EOB to indicate that the patient owes this amount. High-deductible plans generate PR-1 frequently, especially in Q1 of the plan year before deductibles accumulate.',
 'If the deductible amount seems higher than expected, request the full deductible accumulation history for the plan year. Verify that all in-network claims counted toward the deductible are correctly recorded. If the plan year recently reset and the patient wasn''t notified, file a complaint with the insurer.',
 ARRAY['PR-2','PR-3','CO-1'],
 'bill_dispute'),

('PR-2',
 'other',
 'The coinsurance amount is the patient''s percentage-based share of the allowed cost after the deductible.',
 'Confirm the coinsurance rate in the plan''s Summary of Benefits and verify the claim was processed at the correct (in-network vs. out-of-network) rate.',
 'CARC',
 'PR-2 marks patient coinsurance responsibility. Errors occur when a service is processed at an out-of-network rate (resulting in a higher coinsurance calculation), when the allowed amount is disputed, or when a plan year deductible was incorrectly still showing as unmet.',
 'Review the EOB allowed amount and compare to the contracted fee schedule. If the coinsurance was calculated on an inflated out-of-network rate when the provider is actually in-network, dispute the network classification. If the service qualifies under No Surprises Act protections, the out-of-network rate may be capped.',
 ARRAY['PR-1','PR-3','CO-2'],
 'bill_dispute'),

('PR-3',
 'other',
 'A fixed co-payment is owed by the patient for this type of service visit.',
 'Verify the correct co-pay tier for this service category (primary care, specialist, urgent care, ER) in the patient''s current plan year.',
 'CARC',
 'PR-3 indicates a co-pay is due. The most common error is applying the wrong co-pay tier — for example, billing a specialist co-pay when the visit qualifies as a PCP visit, or applying a higher ER co-pay when the patient was later admitted (which often waives the ER co-pay).',
 'Check the Summary of Benefits for the applicable co-pay by service type. If the patient was admitted from the ER, many plans waive the ER co-pay — if it was charged, dispute with the admission documentation. If a telehealth visit was billed at the wrong co-pay tier, provide the telehealth visit documentation.',
 ARRAY['PR-1','PR-2','CO-3'],
 'bill_dispute'),

('PR-26',
 'other',
 'The expenses were incurred before the patient''s coverage became effective — no benefits apply for pre-effective-date services.',
 'Confirm the coverage effective date. If the insurer''s records are wrong or if continuous creditable coverage applies, provide documentation.',
 'CARC',
 'PR-26 occurs when a claim''s service date precedes the patient''s plan effective date. This happens with new hires, newly enrolled dependents, plan changes during open enrollment, or administrative enrollment delays that create a gap between the employer''s records and the insurer''s system.',
 'Request the insurer''s record of the coverage effective date and compare to the employer''s enrollment confirmation. If the insurer''s effective date is wrong due to an enrollment processing delay, request correction with the employer''s HR documentation. Submit a corrected claim once the effective date is corrected.',
 ARRAY['CO-27','PR-27'],
 'denial_decoder'),

('PR-27',
 'other',
 'The expenses were incurred after the patient''s coverage termination date — these are the patient''s responsibility.',
 'Verify the termination date against the patient''s records. If coverage was active (grace period, COBRA, retroactive reinstatement), provide documentation.',
 'CARC',
 'PR-27 mirrors CO-27 but identifies the amount as patient responsibility rather than a write-off. It is issued when an insurer terminates a policy and the patient receives care during or after the termination. Retroactive termination (often due to premium non-payment) creates the most disputes.',
 'Obtain evidence of coverage on the service date: insurance card, explanation of benefits from around the same period, or COBRA election documents. If termination was retroactive and the patient had no knowledge, invoke the plan''s required advance notice provisions for termination. COBRA-eligible patients have 60 days to elect COBRA retroactively.',
 ARRAY['CO-200','PR-26'],
 'denial_decoder'),

('PR-31',
 'other',
 'The patient cannot be identified as the insured member on record with this plan.',
 'Verify the patient''s member ID, date of birth, and name spelling against the insurer''s records. Correct any discrepancies and resubmit.',
 'CARC',
 'PR-31 is an eligibility failure — the payer cannot match the claim to an active member. Common causes include transposed member ID digits, hyphenated names entered inconsistently, date of birth mismatches, or coverage that lapsed without the patient''s knowledge.',
 'Call the insurer''s eligibility line to verify the exact member information on file. Correct the claim with accurate member ID, name, and DOB. If the patient is covered under a spouse''s or parent''s plan, ensure the subscriber''s information is correctly included. If the insurer''s records are wrong, request an administrative correction.',
 ARRAY['N30','CO-22'],
 'denial_decoder'),

('PR-96',
 'other',
 'The billed service is not covered under the patient''s benefit plan and is therefore the patient''s responsibility.',
 'Identify the specific exclusion in the plan document. Explore whether the patient qualifies for any exception or whether a different billing approach would result in coverage.',
 'CARC',
 'PR-96 mirrors CO-96 as a patient-responsibility version — the service is not covered, and the balance falls to the patient. This is common for cosmetic procedures, certain fertility services, weight loss programs, or services that require specific diagnoses not present on the claim.',
 'Request the specific plan exclusion cited. Review the full benefit summary to see if the service is partially covered under a different category. If the denial is incorrect (e.g., the service is covered under preventive care provisions), dispute with the treating provider''s documentation showing the preventive or diagnostic nature of the visit.',
 ARRAY['CO-96','CO-50'],
 'denial_decoder'),

('PR-204',
 'coordination',
 'This service or equipment is not covered under this specific insurance plan — patient responsibility or a different payer applies.',
 'Determine whether another insurer is primary. If no other coverage applies, explore whether a state program, Medicaid, or manufacturer assistance program covers this cost.',
 'CARC',
 'PR-204 is a non-coverage denial specific to coordination of benefits scenarios. It often appears when a secondary payer denies a service that the primary also didn''t cover, leaving the patient with the full bill. It can also appear when a service is covered by one type of benefit (e.g., DME) but was incorrectly billed under another (e.g., pharmacy).',
 'Confirm whether any other payer (Medicaid, secondary commercial, Medicare) would cover this service. If the denial is due to a billing category error, resubmit under the correct benefit category. For DME specifically, verify the HCPCS code and Certificate of Medical Necessity (CMN) requirements.',
 ARRAY['CO-22','OA-23','N20'],
 'denial_decoder'),

-- ── OA SERIES (Other Adjustment) ───────────────────────────────────────────

('OA-1',
 'coordination',
 'This amount has been applied to the patient''s deductible as an "other adjustment" — typically from a secondary payer''s perspective.',
 'Review the full coordination of benefits payment chain and confirm all payers have been billed correctly in sequence.',
 'CARC',
 'OA-1 appears on secondary payer EOBs or in situations where the adjustment is not contractually driven (as with CO) or purely patient responsibility (as with PR). It commonly reflects coordination of benefit adjustments where the secondary payer is tracking the primary payment.',
 'Verify the primary EOB was submitted correctly to the secondary payer. The secondary payer should credit what the primary paid and apply the remainder to the patient''s deductible or coinsurance under their plan. If the secondary payer has misapplied the primary payment, submit a corrected claim with the primary EOB attached.',
 ARRAY['CO-1','PR-1','OA-23'],
 'bill_dispute'),

('OA-2',
 'coordination',
 'The payment has been adjusted because the claim is a contractual adjustment under the provider''s agreement with a contracted network.',
 'Confirm the network contract terms. If the provider is contracted, this is an expected write-off. If the provider is not contracted, dispute the reduction.',
 'CARC',
 'OA-2 reflects a payment adjustment due to an existing contractual relationship, often within a network or a capitation or case rate arrangement. It is similar to CO-45 but used by payers for specific contractual adjustment scenarios at the claim level.',
 'If the adjustment reduces the payment in a way inconsistent with the contract, request the fee schedule comparison showing what was applied. If the provider is not contracted with this payer, dispute the reduction and request payment at billed charges or at out-of-network rates per state law.',
 ARRAY['CO-24','CO-45'],
 'bill_dispute'),

('OA-18',
 'other',
 'This claim is an exact duplicate of a previously submitted and processed claim.',
 'Verify whether the original claim was processed and paid. If paid, no action is needed. If the original was denied, the resubmission should have been filed as a corrected claim, not a duplicate.',
 'CARC',
 'OA-18 is the duplicate claim denial. It occurs when the exact same claim (same DOS, procedure, provider, and patient) is submitted more than once. This can happen through billing system errors, manual resubmissions, or clearinghouse re-transmission errors. It is almost always a billing workflow issue.',
 'Search for the original claim''s payment status. If it was paid, reconcile the payment and no further action is needed. If it was denied, resubmit as a corrected claim (condition code 7 on institutional claims or a corrected claim box on professional claims) rather than a duplicate. If the claim was never paid and the original submission date is verifiable, dispute the duplicate denial with proof of the original''s distinct submission.',
 ARRAY['CO-16','CO-29'],
 'denial_decoder'),

('OA-23',
 'coordination',
 'A payment was received from another payer — this adjustment reflects that payment being applied toward the patient''s obligation.',
 'Ensure the primary EOB was submitted correctly. Verify that the secondary payer''s coordination of benefits calculation correctly accounts for the primary payment.',
 'CARC',
 'OA-23 appears on secondary payer EOBs to indicate that a payment from the primary insurer has been received and is being factored into the secondary adjudication. It is a normal part of dual-coverage billing but can cause confusion when the secondary calculates the patient balance differently than expected.',
 'Review both the primary and secondary EOBs side by side. Confirm the secondary payer credited the primary payment amount correctly. If the secondary payer is not crediting the full primary payment (leaving the patient with a higher balance than expected), dispute with both EOBs as documentation.',
 ARRAY['CO-22','OA-1','PR-204'],
 'denial_decoder'),

-- ── REMARK / N CODES ────────────────────────────────────────────────────────

('N1',
 'other',
 'The payer needs additional information to process this claim — a specific attachment or clarification is required.',
 'Contact the payer to identify exactly what additional information is needed, provide it promptly, and confirm the resubmission deadline.',
 'RARC',
 'N1 is a catch-all Remark code indicating the payer cannot process the claim without something more. It is often paired with a more specific N code and a specific reason (e.g., operative notes, itemized bill, medical records). It may be issued as a request for additional documentation (RAD) rather than a final denial.',
 'Treat N1 as a time-sensitive request — many payers have short windows for submitting additional information (30–60 days). Identify the specific attachment type requested (usually indicated by a companion Remark code), submit it promptly, and retain proof of submission. Follow up within 2 weeks if no acknowledgment is received.',
 ARRAY['CO-16','N3','N4'],
 'denial_decoder'),

('N3',
 'prior_auth',
 'The prior authorization number is missing, incomplete, or invalid on this claim.',
 'Locate the prior authorization number from the approval letter and resubmit the claim with the correct authorization number in the appropriate field.',
 'RARC',
 'N3 is triggered when a service requires prior authorization but the authorization number is absent or incorrectly entered on the claim. This can happen because the authorization was obtained verbally without capturing the reference number, the authorization was for a different service date or code, or the claim was submitted before the authorization was issued.',
 'Retrieve the written authorization approval letter from the insurer or the provider''s pre-authorization log. Confirm the authorization number matches the service dates, procedure codes, and units on the claim. Resubmit the corrected claim with the authorization number in field 23 (CMS-1500) or the appropriate loop on electronic claims.',
 ARRAY['CO-197','CO-16','N1'],
 'appeal_generator'),

('N4',
 'other',
 'A procedure code, modifier, or reference number is missing, incomplete, or invalid.',
 'Review the claim for missing or incorrect CPT codes, HCPCS codes, or required modifiers. Correct and resubmit.',
 'RARC',
 'N4 indicates a coding deficiency on the claim. This includes missing procedure codes, invalid CPT/HCPCS codes for the service type, omitted required modifiers (such as LT/RT for bilateral procedures, or -25 for E&M on the same day as a procedure), or incorrect code versions.',
 'Pull the original claim and review each procedure against the payer''s fee schedule and billing guidelines. Confirm all required modifiers are included. Check that the CPT/HCPCS codes are from the correct year''s edition. Resubmit the corrected claim — if the error was solely a missing modifier, this is a low-complexity fix with a high overturn rate.',
 ARRAY['CO-11','CO-16','N1'],
 'denial_decoder'),

('N10',
 'other',
 'Payment has been adjusted based on the information available — the payer processed the claim using their data, which may differ from what was submitted.',
 'Request the specific data source the payer used to adjudicate differently than submitted. Provide corrected or additional clinical documentation if their information is incomplete.',
 'RARC',
 'N10 is used when the payer makes a payment determination based on their internal clinical review or data that differs from what the provider submitted. This often accompanies medical necessity reviews, length-of-stay determinations, or payment reductions based on the payer''s own norms and benchmarks rather than the treating physician''s documentation.',
 'Request the payer''s clinical rationale in writing — specifically what information they relied on and what criteria were applied. If their data is incomplete or incorrect, submit a comprehensive appeal with full medical records, physician attestation, and any relevant clinical guidelines that contradict their determination.',
 ARRAY['CO-234','CO-151'],
 'appeal_generator'),

('N15',
 'other',
 'Services cannot be paid when the patient is deceased — the claim was submitted for a date of service after the patient''s recorded date of death.',
 'Verify the date of service against the patient''s actual date of death. If the insurer''s date of death record is incorrect, provide the death certificate or hospital records.',
 'RARC',
 'N15 is issued when the insurer''s system records a date of death for the patient that precedes the service date. This can occur due to reporting errors (e.g., a social security death record mismatch), administrative errors in the insurer''s database, or in rare cases, claims submitted posthumously for legitimate pre-death services.',
 'If the services were rendered before death, correct the date of service and resubmit with hospital or clinical records confirming the actual service date. If the death record in the insurer''s system is incorrect, submit a formal correction request with the corrected death certificate or social security records.',
 ARRAY['CO-27','CO-200'],
 'denial_decoder'),

('N20',
 'coordination',
 'The payer was unable to identify the other payer in this coordination of benefits scenario.',
 'Provide the primary insurer''s name, address, and contact information. Resubmit the claim with complete primary payer details.',
 'RARC',
 'N20 appears when a claim indicates another payer is involved but the secondary payer cannot identify or reach the primary insurer. This is common when the primary payer''s name is abbreviated, their electronic payer ID is missing, or the plan is self-funded and not easily identifiable.',
 'Include the primary payer''s full legal name, address, payer ID, and the primary EOB with the resubmission. For self-funded plans, include the plan sponsor''s name and the TPA (third-party administrator) contact information. Electronic claims should include the primary payer''s NPI or payer ID in the appropriate loop.',
 ARRAY['CO-22','OA-23','PR-204'],
 'denial_decoder'),

('N30',
 'other',
 'The patient cannot be identified as an insured member of this plan based on the information submitted.',
 'Verify patient eligibility in real time through the payer''s portal or clearinghouse 270/271 transaction. Correct any demographic mismatches and resubmit.',
 'RARC',
 'N30 is an eligibility mismatch denial — the payer cannot locate an active member record matching the subscriber or patient information on the claim. Common causes include transposed digits in the member ID, name spelling variations, mismatched dates of birth, or coverage that lapsed prior to the service date.',
 'Run an eligibility verification (EDI 270/271) to retrieve the exact member data on file. Correct any demographic errors (member ID, spelling, DOB) and resubmit. If the patient has since lost coverage, explore retroactive eligibility reinstatement, Medicaid eligibility, or COBRA. Document the real-time eligibility check result as proof the patient appeared eligible at the time of service.',
 ARRAY['PR-31','CO-22','N20'],
 'denial_decoder'),

('N58',
 'other',
 'The patient account number is missing, incomplete, or invalid on the claim.',
 'Locate the correct patient account number used by the billing system and resubmit with the accurate account number in the appropriate claim field.',
 'RARC',
 'N58 is a claim-level data deficiency — a required patient account number is absent or improperly formatted. This most frequently occurs in high-volume billing environments with legacy systems where account numbers may be truncated, omitted during batch submission, or formatted inconsistently with the payer''s requirements.',
 'Review the claim''s patient account number field (Box 26 on CMS-1500 or equivalent on UB-04) and confirm it matches the practice management system''s record. Resubmit with the corrected value. This is a low-complexity administrative fix.',
 ARRAY['CO-16','N1'],
 'denial_decoder'),

('N95',
 'other',
 'Benefits are not available for this type of service under the patient''s current plan.',
 'Review the plan''s benefit exclusions. If the service is covered under a different benefit category or with prior authorization, explore those options.',
 'RARC',
 'N95 is a benefit non-coverage Remark code. It often accompanies CO-50 or CO-96 to specify that the service type (e.g., acupuncture, chiropractic, experimental treatment) is simply not a covered benefit under this specific plan, regardless of medical necessity.',
 'Request the complete Summary of Benefits and Coverage (SBC) document. If the service is medically necessary and a similar service within a covered category could be billed, discuss recoding with the treating provider. If the exclusion appears to violate ACA essential health benefit requirements or state mandate, file a complaint with the state insurance commissioner.',
 ARRAY['CO-50','CO-96','N115'],
 'appeal_generator'),

('N115',
 'other',
 'This decision is not subject to the Independent Medical Review (IMR) process — a different appeal pathway applies.',
 'Identify the correct internal appeal process for this denial type and file within the specified timeframe.',
 'RARC',
 'N115 is a procedural Remark code directing the patient or provider to a different appeals pathway. Some denial types (administrative denials, timely filing, billing errors) are not eligible for IMR and must go through the payer''s internal appeals process exclusively. Understanding which appeal route applies is critical.',
 'Read the denial letter carefully for the specified appeal pathway. For clinical denials, the standard route is internal appeal → external independent review. For administrative denials (timely filing, billing errors), follow the payer''s administrative reconsideration process. State insurance commissioners can assist if the payer is blocking access to appropriate appeals.',
 ARRAY['N95','CO-50'],
 'appeal_generator'),

('N130',
 'other',
 'A claim submission fee is applicable — the payer charges a processing fee for this type of claim submission.',
 'Verify whether this fee is permitted under your provider agreement and applicable state law. If impermissible, dispute the fee.',
 'RARC',
 'N130 indicates the payer is applying a claim submission or processing fee. This is uncommon for standard health claims but may appear for workers'' compensation, auto insurer claims, or certain government program submissions. Some fee arrangements are permitted by contract, but others may violate state insurance regulations.',
 'Review your provider agreement for any clause permitting claim submission fees. Check state insurance department guidance — many states prohibit payers from charging submission fees to providers. If no contractual or regulatory basis exists for the fee, dispute in writing and file a complaint with the state insurance commissioner if the payer does not remove it.',
 ARRAY['CO-45'],
 'bill_dispute'),

('N176',
 'other',
 'The services billed are not covered when performed by this type of provider — coverage is restricted to a specific provider specialty or license type.',
 'Verify whether the service can be billed under a supervising or credentialed provider''s NPI. Explore whether the provider qualifies for an exception.',
 'RARC',
 'N176 occurs when coverage restrictions limit a service to a specific provider type (e.g., a service covered only when performed by an MD is billed by an NP or PA, or a therapy service billed by an unlicensed therapist under supervision). Scope-of-practice insurance restrictions vary by state and plan.',
 'Identify the specific provider type restriction in the coverage policy. If the service was performed under the supervision of a qualifying provider, resubmit under the supervising physician''s NPI. If the provider has additional credentials that qualify them, include attestation and licensure documentation. For states with full-practice authority laws, cite the applicable statute.',
 ARRAY['CO-50','CO-197','N95'],
 'appeal_generator'),

('N362',
 'prior_auth',
 'The number of units, days, or visits for this service exceeds the plan''s benefit limitation or authorized quantity.',
 'Request a benefit extension authorization. Submit clinical documentation justifying the additional units or visits as medically necessary.',
 'RARC',
 'N362 triggers when a claim''s quantity exceeds what was authorized or what the plan covers per benefit period — common for physical therapy (visit limits), skilled nursing (day limits), DME (monthly unit limits), or home health visits. It may also occur when billing a multi-unit procedure without the correct quantity modifier.',
 'Determine whether a quantity or visit limit was reached versus a prior authorization limit. For benefit limits, request a medical necessity exception — many plans allow additional covered visits when standard limitations have been exhausted and ongoing need is documented. For authorization limits, request a retroactive or prospective extension citing clinical progress notes.',
 ARRAY['CO-119','CO-4','CO-197'],
 'appeal_generator'),

('N519',
 'other',
 'The date of service on this claim is prior to the patient''s recorded Medicare Part A or Part B entitlement date.',
 'Verify the patient''s Medicare entitlement date. If Part B coverage was active on the date of service, provide the Medicare card and enrollment date to correct the record.',
 'RARC',
 'N519 is specific to Medicare claims. It indicates the claim date predates the patient''s Medicare entitlement — the patient was not yet enrolled in Medicare on the date of service. This can occur due to delayed enrollment processing, retroactive termination, or billing to Medicare when a different payer was primary.',
 'Confirm the patient''s Medicare enrollment dates through the CMS eligibility portal (PECOS or HETS). If Medicare was active on the service date and the denial is erroneous, submit a corrected claim with the enrollment confirmation. If Medicare was not yet active, identify whether Medicaid, a private plan, or a marketplace plan was the active payer on that date.',
 ARRAY['CO-27','N30'],
 'denial_decoder'),

('N570',
 'other',
 'Missing/incomplete/invalid credentialing information for the rendering provider.',
 'Submit current credentialing documentation for the rendering provider and follow up with the payer''s provider relations department.',
 'RARC',
 'N570 appears when the payer cannot verify that the rendering provider is credentialed with the plan. Credentialing gaps occur when a new provider joins a practice and billing begins before credentialing is complete, when re-credentialing lapses, or when the provider''s NPI is not linked to the group''s contract.',
 'Contact the payer''s provider relations department to determine the credentialing status and what documentation is outstanding. Submit CAQH profile access or direct credentialing documents as requested. For interim periods, determine whether a supervising or already-credentialed provider can be listed as the rendering provider for the pending period.',
 ARRAY['N176','CO-170'],
 'denial_decoder')

ON CONFLICT (code) DO UPDATE SET
  category                   = EXCLUDED.category,
  plain_language_explanation = EXCLUDED.plain_language_explanation,
  recommended_action         = EXCLUDED.recommended_action,
  source                     = EXCLUDED.source,
  common_causes              = EXCLUDED.common_causes,
  appeal_angle               = EXCLUDED.appeal_angle,
  related_codes              = EXCLUDED.related_codes,
  tool_cta_id                = EXCLUDED.tool_cta_id,
  updated_at                 = NOW();
```

- [ ] **Step 2: Apply seed to local DB**

```bash
cd /Users/sarshlevine/myadvocate
supabase db reset --local
```

Or if you only want to run seed without resetting:

```bash
cd /Users/sarshlevine/myadvocate
psql "$(supabase status | grep DB URL | awk '{print $NF}')" -f supabase/seed/denial_codes.sql
```

Expected: 53 rows inserted/updated, no errors.

- [ ] **Step 3: Verify row count**

```bash
cd /Users/sarshlevine/myadvocate
psql "$(supabase status | grep DB URL | awk '{print $NF}')" -c "SELECT COUNT(*) FROM public.denial_codes;"
```

Expected: `count = 53` (or more if future seeds were added).

- [ ] **Step 4: Spot-check a new field**

```bash
psql "$(supabase status | grep DB URL | awk '{print $NF}')" \
  -c "SELECT code, category, tool_cta_id, related_codes FROM public.denial_codes WHERE code = 'CO-16';"
```

Expected: `category = other`, `tool_cta_id = denial_decoder`, `related_codes = {CO-11,N1,N3,N4}`

---

### Task 6: Run full verification

- [ ] **Step 1: Run all tests**

```bash
cd /Users/sarshlevine/myadvocate
npm test
```

Expected: All tests pass including new `denial-codes.test.ts`. The `run-lib-tests.sh` hook will also fire automatically when `src/lib/` files are saved — this is normal behavior.

- [ ] **Step 2: Run lint**

```bash
cd /Users/sarshlevine/myadvocate
npm run lint
```

Expected: No lint errors or warnings.

- [ ] **Step 3: Verify getRelatedDenialCodes type alignment**

Ensure TypeScript compiles cleanly:

```bash
cd /Users/sarshlevine/myadvocate
npx tsc --noEmit
```

Expected: No type errors.

---

## Acceptance Criteria Checklist

- [ ] Migration `supabase/migrations/*_enrich-denial-codes.sql` exists and applied cleanly
- [ ] `denial_codes` table has `common_causes`, `appeal_angle`, `related_codes`, `tool_cta_id` columns
- [ ] Category CHECK constraint accepts `prior_auth`, `coordination`, `timely_filing`, `dme`, `pharmacy`, `mental_health`
- [ ] `SELECT COUNT(*) FROM denial_codes` returns 50+
- [ ] `SELECT common_causes FROM denial_codes WHERE code = 'CO-16'` returns non-null text
- [ ] `src/types/domain.ts` exports `DenialCode` interface, `DenialCodeCategory`, `ToolCtaId`
- [ ] `src/types/supabase.ts` denial_codes Row includes all 4 new nullable fields
- [ ] `src/lib/db/denial-codes.ts` exports `getRelatedDenialCodes`
- [ ] `src/lib/db/__tests__/denial-codes.test.ts` has 5 passing tests
- [ ] `npm test` passes, `npm run lint` passes, `npx tsc --noEmit` passes
- [ ] API route `/api/denial-lookup?code=CO-16` returns JSON including `appeal_angle` (no code changes needed — `select()` already fetches all columns)
