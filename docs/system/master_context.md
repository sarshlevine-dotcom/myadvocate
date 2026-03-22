# Master Context — Repo / Drive / NotebookLM Workflow

**Status:** Active working doctrine  
**Last updated:** 2026-03-21  
**Priority:** High

---

## Purpose

This file defines how MyAdvocate should operate across GitHub, Google Drive, NotebookLM, and Claude/Cowork moving forward.

It exists to prevent shadow systems, duplicate documentation structures, privacy drift, and confusion about where canonical truth lives.

---

## Core Model

MyAdvocate is a **repo-first system**.

### Source of truth by layer

| Layer | Role | Canonical owner |
|---|---|---|
| Product code | Application behavior, API routes, components, server actions, tests | GitHub |
| Database structure | Runtime tables, views, migrations, seeds | GitHub + Supabase |
| Governance + strategy docs | Versioned operating doctrine, architecture, implementation plans | GitHub |
| Founder-ready archives | Review packets, exports, board-style docs, selected implementation packs | Google Drive |
| Analysis / synthesis | Question-answering across approved exported docs | NotebookLM |
| Execution operator | Drafting, implementation, doc upkeep, repo changes | Claude / Cowork |

---

## Non-Negotiable Rules

1. **Google Drive does not replace GitHub.**
   Drive is an archive and export layer, not the operational truth of the application.

2. **NotebookLM does not ingest live product state.**
   It reads approved documents only.

3. **No user-data-bearing exports to NotebookLM.**
   Any document routed to Drive for NotebookLM must remain compliant with `SYSTEM.md` and the privacy constitution.

4. **Implementation-driving docs remain version controlled.**
   If a document changes engineering behavior, the canonical copy lives in GitHub.

5. **No shadow taxonomy.**
   New documentation folders must map to real repo systems and canonical docs already in use.

---

## Approved Workflow

### 1. Build
Claude/Cowork works against the GitHub repo and existing canonical docs.

### 2. Document
Key implementation, operations, product, content, and launch materials are maintained in version-controlled markdown/docx files.

### 3. Export
A selected subset is exported to Google Drive for founder review, external reading, and NotebookLM ingestion.

### 4. Analyze
NotebookLM is used to query approved documentation only.

### 5. Feed back
Insights from NotebookLM become tickets, implementation notes, new docs, or updated repo files.

---

## Approved NotebookLM Source Types

- Architecture summaries
- Sprint summaries and release notes
- Founder decision memos
- Content engine maps and cluster strategy docs
- SEO / EEAT / YMYL process summaries
- Agent hierarchy summaries
- Launch checklists
- Exported implementation packs

### Never route to NotebookLM

- Raw database exports
- Logs containing identifiers
- User case records
- PHI / PII-bearing documents
- Secrets, credentials, or environment details
- Internal-only debugging artifacts not intended for strategic synthesis

---

## Operational Interpretation for MyAdvocate

This repo already contains the authoritative operating layer:
- `SYSTEM.md`
- `CLAUDE.md`
- `docs/` canonical docs
- `supabase/` migrations + seeds
- `context_registry/`
- `src/` application code

Therefore the correct relationship is:

**GitHub → versioned docs and code**  
**Drive → curated exports**  
**NotebookLM → approved analysis over those exports**

Not the other way around.

---

## Implementation Consequence

Any future documentation automation should:
- start from repo files
- export by approved category
- preserve file ownership rules
- keep Drive downstream
- keep NotebookLM downstream of Drive

---

## Change Control

Update this file whenever any of the following changes:
- canonical docs structure
- Drive folder strategy
- NotebookLM ingestion rules
- privacy/export boundaries
- Cowork operating model

When in conflict, `SYSTEM.md` and `CLAUDE.md` still outrank this file.
