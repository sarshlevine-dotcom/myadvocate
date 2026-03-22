# Drive Folder Mapping — MyAdvocate

**Status:** Phase 2C preparation  
**Last updated:** 2026-03-21

---

## Purpose

Defines how GitHub-managed documentation maps to Google Drive folders for export and archival.

---

## Root structure

/MyAdvocate/

### Core folders
- 00_System
- 01_Strategy
- 02_Product
- 03_Content
- 04_Automation
- 05_Compliance
- 06_Operations
- 07_Exports

---

## Mapping rules

| Repo Path | Category | Drive Folder |
|----------|--------|-------------|
| SYSTEM.md | system | 00_System |
| CLAUDE.md | system | 00_System |
| docs/system/** | system | 00_System |
| docs/product/** | product | 02_Product |
| docs/content/** | content | 03_Content |
| docs/operations/** | operations | 06_Operations |
| docs/intelligence/** | intelligence | 04_Automation |

---

## Export routing

All exported files first land in:

/MyAdvocate/07_Exports/

Then optionally:
- copied into category folder
- promoted to NotebookLM source set

---

## Naming convention

Format:

[category]__[doc-name]__[YYYY-MM-DD].md

Example:

system__github_automation__2026-03-21.md

---

## Promotion logic

A file moves from:

Exports → Category → NotebookLM

only if:
- export manifest allows it
- privacy class is compliant
- NotebookLM eligibility = true

---

## Critical rule

Drive is not source of truth.

GitHub remains authoritative.

Drive is:
- archive
- distribution layer
- NotebookLM ingestion surface
