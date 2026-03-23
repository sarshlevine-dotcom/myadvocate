# MyAdvocate System Lock v1

## Purpose

This document defines the single-direction operating model for MyAdvocate so GitHub, Google Drive, NotebookLM, and any future workflow tools do not compete as parallel systems of record.

## Non-Negotiable Rule

**GitHub is the source of truth.**

If a document, rule, spec, or template matters long-term, it must live in the repository first.

Everything else is downstream:

- **Google Drive** = review, collaboration, readable exports, archive
- **NotebookLM** = synthesis, reasoning, query layer
- **Notion / Sheets** = optional trackers and queue inputs only

If information exists only in Drive or only in NotebookLM, it is not canonical.

## One-Way Flow

```text
GitHub canonical files
-> approved export pipeline
-> Google Drive organized folders
-> NotebookLM curated notebook sources
-> decisions / outputs normalized back into GitHub
```

No bidirectional chaos.
No duplicate truth systems.
No tool owns authority over GitHub.

## Folder / Layer Ownership

### GitHub
Use GitHub for:
- canonical docs
- schemas
- registry files
- automation specs
- product specs
- content templates
- approved content assets

### Google Drive
Use Drive only for:
- review packets
- collaboration copies
- founder-readable exports
- archive snapshots
- NotebookLM source staging

### NotebookLM
Use NotebookLM only for:
- synthesis
- gap analysis
- cross-document reasoning
- content ideation
- founder Q&A across approved source packets

Do **not** use NotebookLM as file storage, publishing source, or final authority.

## Approved Drive Buckets

- `00_System`
- `01_Strategy`
- `02_Product`
- `03_Content`
- `04_Automation`
- `05_Compliance`
- `06_Operations`
- `07_Exports`

## Export Rules

1. Only approved docs sync from GitHub to Drive.
2. Historical clutter is archived intentionally, not auto-promoted.
3. Raw or intermediate outputs land in `07_Exports` until normalized.
4. NotebookLM reads curated source packets from Drive, not raw repo dumps.
5. Decisions made from NotebookLM output must be written back to GitHub.

## Immediate Operating Standard

When a new important document is created:
1. Put it in the repo first.
2. Classify it by domain.
3. Sync it to the correct Drive bucket.
4. Add it to the appropriate NotebookLM notebook only if it is approved as a source.

## Tool Conflict Rule

When any tool disagrees or creates confusion:
- GitHub wins on canonical content
- SYSTEM.md wins on constitutional rules
- repo-backed canonical docs beat Drive copies
- Drive copies beat ad hoc chat output
- NotebookLM never overrides canonical docs
