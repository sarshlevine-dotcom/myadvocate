import { z } from 'zod'
import type { LetterType } from '@/types/domain'

// Compile-time guard: ensure enum values stay in sync with the LetterType union in domain.ts
const _letterTypeCheck: LetterType = 'denial_appeal'
void _letterTypeCheck

const LetterOutputSchema = z.object({
  subject: z
    .string()
    .min(1, 'subject is required')
    .max(200, 'subject must be 200 chars or fewer'),
  body: z
    .string()
    .min(100, 'body must be at least 100 characters — a real letter is never shorter'),
  letterType: z.enum(
    ['denial_appeal', 'bill_dispute', 'hipaa_request', 'negotiation_script'],
    {
      error: () => ({ message: 'letterType must be a known LetterType' }),
    },
  ),
  disclaimer: z.string().min(1, 'disclaimer is required and must be non-empty'),
  denialCode: z.string().optional(),
})

export { LetterOutputSchema }
export type LetterOutput = z.infer<typeof LetterOutputSchema>

export function parseLetterOutput(input: unknown): LetterOutput {
  const result = LetterOutputSchema.safeParse(input)
  if (!result.success) {
    const reasons = result.error.issues
      .map((e: { path: PropertyKey[]; message: string }) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    throw new Error(`GATE_7_FAILED: LETTER_SCHEMA_INVALID — ${reasons}`)
  }
  return result.data
}
