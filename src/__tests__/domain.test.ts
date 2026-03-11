import { describe, it, expect } from 'vitest'
import { CASE_TRANSITIONS, ARTIFACT_TRANSITIONS } from '@/types/domain'

describe('Case state machine', () => {
  it('open can transition to in_progress', () => {
    expect(CASE_TRANSITIONS.open).toContain('in_progress')
  })
  it('completed cannot transition to open', () => {
    expect(CASE_TRANSITIONS.completed).not.toContain('open')
  })
  it('archived has no outgoing transitions', () => {
    expect(CASE_TRANSITIONS.archived).toHaveLength(0)
  })
})

describe('Artifact state machine', () => {
  it('review_required can only go to released or archived', () => {
    expect(ARTIFACT_TRANSITIONS.review_required).toEqual(['released', 'archived'])
  })
  it('draft cannot go directly to released', () => {
    expect(ARTIFACT_TRANSITIONS.draft).not.toContain('released')
  })
})
