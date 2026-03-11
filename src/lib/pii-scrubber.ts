// MA-SEC-002 P2 — strips PII before any Anthropic API call
// NEVER call Anthropic API without running this first

const PII_FIELDS = [
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
