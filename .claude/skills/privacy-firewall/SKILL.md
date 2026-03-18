# Privacy Firewall

This skill defines exactly what each workflow may send to the AI model and what must be scrubbed or withheld.
Load this whenever working on any feature that touches user data or calls the AI model.

## The Four-Layer Architecture (Non-Negotiable, Structural)

### Layer 1 — Context Firewall
- ALL user input arrives via structured form fields only
- NO freeform narrative fields ("describe your situation in your own words")
- NO open-ended medical history fields
- The form design IS the privacy control — not a policy, a structure
- **Rule:** If you're adding a text input field, it must be bounded (issue type, state, insurer name, dollar amount, date — not a narrative box)

### Layer 2 — PII Scrubber
- Runs server-side, before every AI model call
- Must strip: name, DOB, address, phone, email, insurance ID, SSN, provider name (if it identifies the patient), any free-text that slipped through Layer 1
- The AI model NEVER receives raw PII
- **Rule:** If you're writing a function that calls the Claude API, the PII scrubber must run immediately before that call. No exceptions.

### Layer 3 — Data Minimization
- Store only what is operationally necessary
- Specific diagnoses: NEVER stored. Category-level only (Chronic Navigator, Phase 4+).
- Insurance ID numbers: NEVER stored
- User owns their generated outputs — exportable and deletable on demand
- **Rule:** If you're adding a database column, ask: is this the minimum data required? If a category field serves the purpose, don't store the specific value.

### Layer 4 — Access Controls
- Supabase RLS: users access only their own data
- Founder review queue: accesses anonymized output metadata only (never raw user data)
- Owner reporting (Google Sheets): receives aggregated metrics only — never user records, never case content
- **Rule:** Every new Supabase table needs an RLS policy. No table without RLS ships.

## What Each Workflow May Send to the AI Model

| Workflow | Allowed Inputs | Must Be Stripped Before Call |
|---|---|---|
| generateAppealLetter() | Issue type, denial code, insurer type, state, denial date, plan type | Name, DOB, address, insurance ID, provider name |
| generateDisputeLetter() | Bill amount, service type, date of service, facility type, state | Name, DOB, address, account number, provider name |
| explainDenialCode() | Denial code, insurer type, state | Everything else |
| getPatientRights() | State, issue type, facility type | Everything else |
| routeComplaint() | Issue type, state, resolution attempted | Name, contact details, provider name |
| generateBillingAnalysis() | Itemized service codes, billed amounts, state | Name, account number, DOB, provider name |

## What Is Never Stored
- Specific diagnoses (store: category like "chronic condition" — not "Type 2 Diabetes")
- Insurance ID numbers
- Raw AI prompts containing user data (store: trace metadata in Langfuse — not the payload)
- Attorney referral data without formal privacy addendum executed

## Attorney Referral Data Rule
Before any user data is transmitted to an attorney referral partner:
- Formal privacy addendum must be executed (not just agreed to — signed)
- Only anonymized case metadata is transmitted until addendum is in place
- This is a hard stop, not a guideline

## Owner Reporting Layer Rule
- Google Sheets owner reporting reads aggregated metrics only
- Metrics pushed via n8n webhook — aggregated before transmission
- Google Sheets has no query access to Supabase
- No user records, no case content, no PII ever reaches the reporting layer

## Supabase RLS Pattern
Every user-data table follows this RLS policy:
```sql
-- Users can only access their own rows
CREATE POLICY "users_own_data" ON [table_name]
  FOR ALL USING (auth.uid() = user_id);

-- Founder review queue: anonymized metadata only (separate view, not raw table access)
```

## Pre-Ship Privacy Checklist
Before any feature ships, run /review-privacy and confirm:
- [ ] Layer 1: Structured inputs only — no freeform narrative
- [ ] Layer 2: PII scrubber runs before every AI call
- [ ] Layer 3: Only minimum necessary data stored
- [ ] Layer 4: RLS policy in place, owner reporting receives aggregated metrics only
