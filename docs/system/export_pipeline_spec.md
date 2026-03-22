# Export Pipeline Specification

**Status:** Phase 2C ready  
**Last updated:** 2026-03-21

---

## Purpose

Defines the full pipeline from GitHub → Drive → NotebookLM.

---

## Pipeline overview

1. GitHub detects change
2. Export whitelist classifies file
3. Manifest is generated
4. File is transformed
5. File is uploaded to Drive
6. File optionally promoted to NotebookLM

---

## Step-by-step flow

### Step 1 — Detection
Trigger:
- push to main
- approved doc paths only

### Step 2 — Classification
Uses:
- export_whitelist.json

Outputs:
- category
- drive folder
- notebook eligibility
- privacy class

### Step 3 — Manifest
File:
export_manifest.json

Contains:
- file
- metadata
- routing instructions

### Step 4 — Transformation
Convert:
- markdown → clean markdown or doc format

Apply:
- naming convention
- header normalization

### Step 5 — Upload
Destination:
/MyAdvocate/07_Exports/

Then:
- optionally copy to category folder

### Step 6 — NotebookLM Promotion
Only if:
- notebooklm_eligible = true
- passes whitelist rules

---

## Failure handling

If any step fails:
- do not upload
- log failure in workflow

---

## Logging

Each run should output:
- files processed
- files exported
- files skipped
- reasons

---

## Security rules

Never export:
- user data
- raw database content
- context registry full dumps
- secrets or env files

---

## Critical rule

Export pipeline must always prioritize:
1. safety
2. correctness
3. clarity
4. usefulness

not speed
