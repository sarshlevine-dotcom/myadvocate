// MA-SEC-002 P2 — strips PII before any Anthropic API call
// NEVER call Anthropic API without running this first

// Exported so Gate 2 of the 7-gate chain can call verifyScrubbed() after scrubPII().
// Single source of truth for PII field names — never duplicate this list elsewhere.
export const PII_FIELDS = [
  'name', 'firstName', 'lastName', 'fullName',
  'dob', 'dateOfBirth', 'birthDate',
  'ssn', 'socialSecurityNumber',
  'address', 'streetAddress', 'city', 'zipCode', 'zip',
  'memberId', 'memberNumber', 'policyNumber',
  'providerName', 'doctorName', 'physicianName',
  'phone', 'phoneNumber', 'email',
] as const

export function scrubPII(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) =>
      !PII_FIELDS.includes(key as typeof PII_FIELDS[number])
    )
  )
}

// MA-AUT-006 §G6 Gate 2: clean assertion.
// Called immediately after scrubPII() to assert the scrub ran and no PII key names remain.
// Throws with PII_FIELDS_REMAINING if any PII key is still present — halts execution before
// any data reaches the prompt or the Anthropic API.
export function verifyScrubbed(payload: Record<string, unknown>): void {
  const remaining = (PII_FIELDS as readonly string[]).filter(f =>
    Object.prototype.hasOwnProperty.call(payload, f),
  )
  if (remaining.length > 0) {
    throw new Error(`PII_FIELDS_REMAINING: ${remaining.join(', ')}`)
  }
}
