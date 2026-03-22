# GitHub-First Automation Plan

**Status:** Phase 2 plan  
**Last updated:** 2026-03-21

---

## Purpose

Defines the first automation layer for MyAdvocate using GitHub-native tooling instead of n8n.

This plan assumes:
- repo-first operations remain in place
- Google Drive is downstream only
- NotebookLM reads approved exports only
- no raw user data or live database state is exported

---

## Recommendation

Use **GitHub itself first**.

Primary automation surface:
- GitHub Actions
- pull request workflow
- branch protection + review discipline
- issue templates and labels for export tasks

Opal or any additional orchestration layer should remain optional until the GitHub-first path is stable.

---

## Why GitHub first fits MyAdvocate

1. The repo is already the canonical engineering and documentation layer.
2. The system already depends on branch-based change control.
3. Governance-sensitive docs should stay inside the same review path as code.
4. Export logic should be triggered from versioned changes, not from a parallel tool first.

---

## Phase 2 automation goals

### Goal 1 — Detect approved docs changes
Watch only approved paths:
- `docs/system/**`
- `docs/product/**`
- `docs/content/**`
- `docs/operations/**`
- selected files in `docs/intelligence/**`
- selected root files (`SYSTEM.md`, `CLAUDE.md`)

### Goal 2 — Build export candidates
For every approved change:
- identify changed files
- classify export eligibility
- generate export manifest

### Goal 3 — Controlled downstream sync
Export only approved categories to Drive.

### Goal 4 — NotebookLM-ready layer
Route only curated files into the NotebookLM source folder.

---

## Automation architecture

### Trigger
GitHub push to `main` or merged PR affecting approved doc paths.

### Job 1 — Change classification
- list changed files
- compare against whitelist
- skip if nothing exportable changed

### Job 2 — Export manifest generation
Create a machine-readable manifest such as:
- file path
- category
- export destination
- NotebookLM eligible: yes/no
- privacy class

### Job 3 — Transformation
Convert markdown/docx source into the chosen export format.

### Job 4 — Upload
Upload to Google Drive destination folder.

### Job 5 — Logging
Write export summary to workflow output or artifact log.

---

## Approval model

For MyAdvocate, the first stable version should be:
- automatic classification
- automatic manifest generation
- optional manual approval before Drive upload

That keeps governance tight while removing busywork.

---

## Guardrails

- Never export from `src/`, `supabase/`, or runtime data directories directly
- Never export `context_registry/` wholesale
- Never export secrets or environment files
- Never upload anything marked as non-exportable in the manifest
- Never make NotebookLM eligibility the default; it must be explicitly granted

---

## Suggested GitHub-native rollout

### Stage A — Documentation automation only
- detect changes
- generate export manifest
- no external upload yet

### Stage B — Drive upload with approval gate
- upload approved files to Drive
- keep NotebookLM folder separate

### Stage C — NotebookLM source promotion
- copy only approved export artifacts into NotebookLM folder

---

## What this enables

A GitHub update can ripple downstream **selectively**:

GitHub doc change  
→ workflow detects approved file  
→ export manifest created  
→ approved upload to Drive  
→ optional promotion into NotebookLM source folder

This is the correct ripple model for MyAdvocate.

---

## Decision

Phase 2 should be built with **GitHub Actions first**. That gives the cleanest fit with the repo, the lowest complexity, and the strongest governance control.
